package utils

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// DumpRoutes writes a markdown table of all registered routes for quick auditing.
func DumpRoutes(app *fiber.App, outPath string) error {
	type row struct{ Method, Path string }
	rows := make([]row, 0, 256)
	for _, r := range app.GetRoutes() {
		rows = append(rows, row{Method: r.Method, Path: r.Path})
	}
	sort.Slice(rows, func(i, j int) bool {
		if rows[i].Path == rows[j].Path {
			return rows[i].Method < rows[j].Method
		}
		return rows[i].Path < rows[j].Path
	})

	var b strings.Builder
	b.WriteString("# API Route Map\n\n")
	b.WriteString("| Method | Path |\n|---|---|\n")
	for _, r := range rows {
		fmt.Fprintf(&b, "| %s | %s |\n", r.Method, r.Path)
	}

	if err := os.MkdirAll(filepath.Dir(outPath), 0o755); err != nil {
		return err
	}
	return os.WriteFile(outPath, []byte(b.String()), 0o644)
}
