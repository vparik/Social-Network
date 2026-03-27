window.ConfirmModal = {
    name: "ConfirmModal",

    props: {
        isOpen: {
            type: Boolean,
            default: false
        },
        title: {
            type: String,
            default: "Confirm action"
        },
        message: {
            type: String,
            default: "Are you sure?"
        },
        confirmText: {
            type: String,
            default: "Confirm"
        },
        cancelText: {
            type: String,
            default: "Cancel"
        },
        danger: {
            type: Boolean,
            default: false
        }
    },

    emits: ["confirm", "cancel"],

    methods: {
        onOverlayClick() {
          this.$emit("cancel");
        },

        onDialogClick(event) {
          event.stopPropagation();
        },

        onEscape(event) {
          if (event.key === "Escape" && this.isOpen) {
            this.$emit("cancel");
          }
        }
    },

    mounted() {
      document.addEventListener("keydown", this.onEscape);
    },

    beforeUnmount() {
      document.removeEventListener("keydown", this.onEscape);
    },

    template: `
        <div
        v-if="isOpen"
        class="confirm-modal-overlay"
        @click="onOverlayClick"
        >
        <div class="confirm-modal" @click="onDialogClick">
            <div class="confirm-modal-title">{{ title }}</div>
            <div class="confirm-modal-message">{{ message }}</div>

            <div class="confirm-modal-actions">
            <button
                type="button"
                class="confirm-modal-btn confirm-modal-btn-cancel"
                @click="$emit('cancel')"
            >
                {{ cancelText }}
            </button>

            <button
                type="button"
                class="confirm-modal-btn"
                :class="danger ? 'confirm-modal-btn-danger' : 'confirm-modal-btn-primary'"
                @click="$emit('confirm')"
            >
                {{ confirmText }}
            </button>
            </div>
        </div>
        </div>
      `
    };   