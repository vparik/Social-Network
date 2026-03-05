package cmd

import (
	"socialnet/internal/database"
	"socialnet/internal/http/server"
)

func Execute() {
	database.InitializeDB()
	server.InitServer()
}
