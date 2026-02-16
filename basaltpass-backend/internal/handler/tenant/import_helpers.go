package tenant

import (
	"io"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type importCodePayload struct {
	Content string   `json:"content"`
	Codes   []string `json:"codes"`
	Items   []string `json:"items"`
}

func readImportRawContent(c *fiber.Ctx) (string, error) {
	contentType := strings.ToLower(strings.TrimSpace(c.Get("Content-Type")))
	if strings.HasPrefix(contentType, "multipart/form-data") {
		content := strings.TrimSpace(c.FormValue("content"))
		if content != "" {
			return content, nil
		}
		fileHeader, err := c.FormFile("file")
		if err == nil && fileHeader != nil {
			f, openErr := fileHeader.Open()
			if openErr != nil {
				return "", openErr
			}
			defer f.Close()
			raw, readErr := io.ReadAll(f)
			if readErr != nil {
				return "", readErr
			}
			return string(raw), nil
		}
		return "", nil
	}

	var req importCodePayload
	if err := c.BodyParser(&req); err != nil {
		return "", err
	}
	if len(req.Codes) > 0 {
		return strings.Join(req.Codes, "\n"), nil
	}
	if len(req.Items) > 0 {
		return strings.Join(req.Items, "\n"), nil
	}
	return req.Content, nil
}

func normalizeCodesFromRaw(raw string) ([]string, int) {
	parts := strings.FieldsFunc(raw, func(r rune) bool {
		return r == '\n' || r == '\r' || r == ',' || r == ';' || r == '\t' || r == ' '
	})
	seen := make(map[string]struct{})
	normalized := make([]string, 0, len(parts))
	duplicateCount := 0
	for _, part := range parts {
		code := strings.ToLower(strings.TrimSpace(part))
		if code == "" {
			continue
		}
		if _, ok := seen[code]; ok {
			duplicateCount++
			continue
		}
		seen[code] = struct{}{}
		normalized = append(normalized, code)
	}
	return normalized, duplicateCount
}

