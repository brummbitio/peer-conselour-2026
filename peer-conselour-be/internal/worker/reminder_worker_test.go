package worker

import (
	"testing"
	"time"

	"peer-conselour-be/pkg/email"
)

func TestDueReminder(t *testing.T) {
	now := time.Date(2026, time.October, 1, 12, 0, 0, 0, time.UTC)
	ago := func(d time.Duration) time.Time { return now.Add(-d) }
	agoPtr := func(d time.Duration) *time.Time { v := ago(d); return &v }

	tests := []struct {
		name           string
		step           int
		sinceReply     time.Duration
		lastReminderAt *time.Time
		wantKind       email.Kind
		wantDue        bool
	}{
		{name: "belum H+1", step: 0, sinceReply: 23 * time.Hour},
		{name: "H+1 jatuh tempo", step: 0, sinceReply: 25 * time.Hour, wantKind: email.KindReminderH1, wantDue: true},
		{name: "step 1 belum H+3", step: 1, sinceReply: 2 * day, lastReminderAt: agoPtr(1 * day)},
		{name: "H+3 jatuh tempo", step: 1, sinceReply: 3 * day, lastReminderAt: agoPtr(2 * day), wantKind: email.KindReminderH3, wantDue: true},
		{name: "H+5 jatuh tempo", step: 2, sinceReply: 5 * day, lastReminderAt: agoPtr(2 * day), wantKind: email.KindReminderH5, wantDue: true},
		{name: "H+7 jatuh tempo", step: 3, sinceReply: 7 * day, lastReminderAt: agoPtr(2 * day), wantKind: email.KindReminderH7, wantDue: true},
		{name: "setelah H+7 berhenti", step: 4, sinceReply: 30 * day, lastReminderAt: agoPtr(10 * day)},
		{name: "step negatif diabaikan", step: -1, sinceReply: 30 * day},
		{name: "tanpa riwayat reminder, balasan lama", step: 0, sinceReply: 10 * day, wantKind: email.KindReminderH1, wantDue: true},
		{name: "tidak beruntun dalam sehari", step: 1, sinceReply: 10 * day, lastReminderAt: agoPtr(30 * time.Minute)},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			kind, due := DueReminder(tc.step, ago(tc.sinceReply), tc.lastReminderAt, now)
			if due != tc.wantDue || kind != tc.wantKind {
				t.Fatalf("DueReminder() = (%q, %v), want (%q, %v)", kind, due, tc.wantKind, tc.wantDue)
			}
		})
	}
}
