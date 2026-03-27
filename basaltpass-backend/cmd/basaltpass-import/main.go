package main

import (
	config "basaltpass-backend/internal/config"
	"basaltpass-backend/internal/service/basaltimport"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"

	"basaltpass-backend/internal/common"
)

func main() {
	var (
		configPath = flag.String("config", "", "Optional config file path")
		dir        = flag.String("dir", "", "Path to a .basalt directory")
		tenantID   = flag.Uint("tenant-id", 0, "Tenant ID to import into")
		userID     = flag.Uint("user-id", 0, "User ID used as creator/updater")
		dryRun     = flag.Bool("dry-run", false, "Validate and preview without writing to DB")
	)
	flag.Parse()

	if *dir == "" {
		log.Fatal("--dir is required")
	}
	if *tenantID == 0 {
		log.Fatal("--tenant-id is required")
	}
	if *userID == 0 {
		log.Fatal("--user-id is required")
	}

	if _, err := config.Load(*configPath); err != nil {
		log.Fatalf("load config: %v", err)
	}

	bundle, err := basaltimport.LoadBundleFromDir(*dir)
	if err != nil {
		log.Fatalf("load bundle: %v", err)
	}

	report, err := basaltimport.ImportBundle(common.DB(), bundle, basaltimport.Options{
		TenantID: uint(*tenantID),
		UserID:   uint(*userID),
		DryRun:   *dryRun,
	})
	if err != nil {
		log.Fatalf("import bundle: %v", err)
	}

	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	if err := enc.Encode(report); err != nil {
		log.Fatalf("encode report: %v", err)
	}

	if *dryRun {
		fmt.Fprintln(os.Stderr, "dry-run completed; no database changes were made")
	}
}
