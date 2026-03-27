package cmd

import (
	"socialnet/internal/cleanup"
	"socialnet/internal/database"
	"socialnet/internal/http/server"
)

func Execute() {
	database.InitDb()
	cleanup.Start()
	server.InitServer()
}
