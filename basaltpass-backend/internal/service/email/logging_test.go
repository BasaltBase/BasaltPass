package email

import "testing"

func TestBuildEmailLogOrderClause(t *testing.T) {
	tests := []struct {
		name   string
		params *EmailLogQueryParams
		want   string
	}{
		{
			name: "default order without sort_by",
			params: &EmailLogQueryParams{
				Page:     1,
				PageSize: 20,
			},
			want: "created_at DESC",
		},
		{
			name: "valid sort_by keeps legacy asc default",
			params: &EmailLogQueryParams{
				Page:     1,
				PageSize: 20,
				SortBy:   "subject",
			},
			want: "subject ASC",
		},
		{
			name: "sort_order overrides legacy sort_desc",
			params: &EmailLogQueryParams{
				Page:      1,
				PageSize:  20,
				SortBy:    "subject",
				SortOrder: "desc",
				SortDesc:  false,
			},
			want: "subject DESC",
		},
		{
			name: "invalid sort_by falls back to created_at",
			params: &EmailLogQueryParams{
				Page:      1,
				PageSize:  20,
				SortBy:    "created_at; DROP TABLE email_logs;--",
				SortOrder: "asc",
			},
			want: "created_at ASC",
		},
		{
			name: "invalid sort_order ignored",
			params: &EmailLogQueryParams{
				Page:      1,
				PageSize:  20,
				SortBy:    "subject",
				SortOrder: "asc; SELECT 1;--",
			},
			want: "subject ASC",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := buildEmailLogOrderClause(tt.params)
			if got != tt.want {
				t.Fatalf("buildEmailLogOrderClause() = %q, want %q", got, tt.want)
			}
		})
	}
}
