package cmd

import (
	"log"
	"socialnet/internal/cleanup"
	"socialnet/internal/database"
	"socialnet/internal/database/store"
	"socialnet/internal/http/server"
	"socialnet/internal/memory"
)

func Execute() {
	database.InitDb()
	initMemory()
	cleanup.Start()
	server.InitServer()
}

func initMemory() {
	entries, err := store.LoadAllUsers()
	if err != nil {
		log.Fatal(err)
	}
	memory.LoadUserCache(entries)
}
