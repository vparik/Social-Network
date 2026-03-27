package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"image/gif"
	"image/jpeg"
	"image/png"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"socialnet/internal/database/store"
	"time"

	"github.com/Des1red/goauthlib/goauth"
)

const maxUploadSize = 5 << 20 // 5 * 1024 * 1024 = 5 MB

// UploadAvatar handles POST /api/upload/avatar.
// Accepts a multipart form with a "file" field.
// Re-encodes the image through Go codecs (strips metadata/payloads),
// saves to ./uploads/avatars/{userID}.{ext}, and updates the user record.
func UploadAvatar(w http.ResponseWriter, r *http.Request) {
	payload := goauth.FromContext(r.Context())
	userID := payload.UserID

	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		http.Error(w, "file too large (max 5 MB)", http.StatusBadRequest)
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "missing file field", http.StatusBadRequest)
		return
	}
	defer file.Close()

	encoded, ext, err := decodeAndReencode(file)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := os.MkdirAll("./uploads/avatars", 0755); err != nil {
		http.Error(w, "failed to create upload directory", http.StatusInternalServerError)
		return
	}

	filename := fmt.Sprintf("%d%s", userID, ext)
	filePath := "./uploads/avatars/" + filename
	if err := os.WriteFile(filePath, encoded, 0644); err != nil {
		http.Error(w, "failed to save file", http.StatusInternalServerError)
		return
	}

	avatarPath := "/uploads/avatars/" + filename
	if err := store.UpdateAvatarPath(userID, avatarPath); err != nil {
		http.Error(w, "failed to update avatar", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"avatarPath": avatarPath})
}

// DELETE /api/upload/avatar handler
// Deletes the user's avatar file from server and clears avatar_path in the DB.
func RemoveAvatar(w http.ResponseWriter, r *http.Request) {
	payload := goauth.FromContext(r.Context())
	userID := payload.UserID

	// Find and delete any existing avatar file for this user ({userID}.*)
	matches, _ := filepath.Glob(fmt.Sprintf("./uploads/avatars/%d.*", userID))
	for _, match := range matches {
		os.Remove(match)
	}

	if err := store.UpdateAvatarPath(userID, ""); err != nil {
		http.Error(w, "failed to remove avatar", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// POST /api/upload/image handler
// Accepts a multipart form with a "file" field.
// Re-encodes the image and saves to ./uploads/posts/{userID}_{timestamp}.{ext}.
// Returns the public URL of the saved image.
func UploadImage(w http.ResponseWriter, r *http.Request) {
	payload := goauth.FromContext(r.Context())
	userID := payload.UserID

	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		http.Error(w, "file too large (max 5 MB)", http.StatusBadRequest)
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "missing file field", http.StatusBadRequest)
		return
	}
	defer file.Close()

	encoded, ext, err := decodeAndReencode(file)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := os.MkdirAll("./uploads/posts", 0755); err != nil {
		http.Error(w, "failed to create upload directory", http.StatusInternalServerError)
		return
	}

	filename := fmt.Sprintf("%d_%d%s", userID, time.Now().UnixNano(), ext)
	filePath := "./uploads/posts/" + filename
	if err := os.WriteFile(filePath, encoded, 0644); err != nil {
		http.Error(w, "failed to save file", http.StatusInternalServerError)
		return
	}

	url := "/uploads/posts/" + filename
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"url": url})
}

// decodeAndReencode reads image data from r, detects the MIME type from the
// first 512 bytes (never trusting filename or Content-Type header), decodes
// it through Go's image codec, and re-encodes it fresh. This strips all non-pixel payload.
// Returns re-encoded bytes and a canonical file extension (e.g. ".jpg").
func decodeAndReencode(r io.Reader) ([]byte, string, error) {
	// Read the first 512 bytes for MIME detection.
	sniff := make([]byte, 512)
	n, err := io.ReadFull(r, sniff)
	if err != nil && err != io.ErrUnexpectedEOF {
		return nil, "", fmt.Errorf("failed to read file")
	}
	sniff = sniff[:n]

	mime := http.DetectContentType(sniff)

	// Reconstruct full reader so the codec sees the complete file.
	full := io.MultiReader(bytes.NewReader(sniff), r)

	var buf bytes.Buffer

	switch mime {
	case "image/jpeg":
		img, err := jpeg.Decode(full)
		if err != nil {
			return nil, "", fmt.Errorf("invalid JPEG image")
		}
		if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 85}); err != nil {
			return nil, "", fmt.Errorf("failed to re-encode image")
		}
		return buf.Bytes(), ".jpg", nil

	case "image/png":
		img, err := png.Decode(full)
		if err != nil {
			return nil, "", fmt.Errorf("invalid PNG image")
		}
		if err := png.Encode(&buf, img); err != nil {
			return nil, "", fmt.Errorf("failed to re-encode image")
		}
		return buf.Bytes(), ".png", nil

	case "image/gif":
		g, err := gif.DecodeAll(full)
		if err != nil {
			return nil, "", fmt.Errorf("invalid GIF image")
		}
		if err := gif.EncodeAll(&buf, g); err != nil {
			return nil, "", fmt.Errorf("failed to re-encode image")
		}
		return buf.Bytes(), ".gif", nil

	default:
		return nil, "", fmt.Errorf("unsupported image type: only JPEG, PNG, GIF and WebP are allowed")
	}
}
