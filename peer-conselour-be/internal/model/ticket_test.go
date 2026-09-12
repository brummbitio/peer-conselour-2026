package model

import (
	"testing"
	"time"
)

func TestTicketIsLegacy(t *testing.T) {
	wib := time.FixedZone("WIB", 7*60*60)

	tests := []struct {
		name      string
		code      string
		createdAt time.Time
		want      bool
	}{
		// Tiket osTicket #004930 dibuat 11 Sep 2026 17:08 WIB: lolos filter tanggal, harus tetap legacy.
		{name: "osTicket di hari peluncuran", code: "004930", createdAt: time.Date(2026, 9, 11, 17, 8, 36, 0, wib), want: true},
		{name: "osTicket lama", code: "000123", createdAt: time.Date(2021, 11, 16, 12, 0, 0, 0, wib), want: true},
		{name: "kode web baru sebelum cutoff", code: "UB-CS-260910-001", createdAt: time.Date(2026, 9, 10, 23, 59, 0, 0, wib), want: true},
		{name: "tiket web baru", code: "UB-CS-260911-994", createdAt: time.Date(2026, 9, 11, 20, 13, 48, 0, wib), want: false},
		{name: "tepat di cutoff", code: "UB-CS-260911-001", createdAt: NewPlatformCutoff, want: false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			ticket := Ticket{Code: tc.code, CreatedAt: tc.createdAt}
			if got := ticket.IsLegacy(); got != tc.want {
				t.Fatalf("IsLegacy() = %v, want %v", got, tc.want)
			}
		})
	}
}
