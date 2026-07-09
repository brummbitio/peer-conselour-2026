package model

import (
	"time"
)

type ScheduleStatus string
type ServiceType string

const (
	SchedulePending    ScheduleStatus = "pending_confirmation"
	ScheduleScheduled  ScheduleStatus = "scheduled"
	ScheduleReschedule ScheduleStatus = "reschedule"
	ScheduleCancelled  ScheduleStatus = "cancelled"
	ScheduleCompleted  ScheduleStatus = "completed"

	ServiceTatapMuka ServiceType = "tatap_muka"
	ServiceOnline    ServiceType = "online"
)

type CounselingSchedule struct {
	ID          uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	TicketID    *uint          `json:"ticket_id"`
	Ticket      *Ticket        `gorm:"foreignKey:TicketID" json:"ticket,omitempty"`
	ClientName  string         `gorm:"size:255;not null" json:"client_name"`
	DateValue   time.Time      `gorm:"type:date;not null" json:"date_value"`
	TimeValue   string         `gorm:"size:100;not null" json:"time_value"`
	HandlerID   *uint          `json:"handler_id"`
	Handler     *User          `gorm:"foreignKey:HandlerID" json:"handler,omitempty"`
	ServiceType ServiceType    `gorm:"type:service_type;not null" json:"service_type"`
	Status      ScheduleStatus `gorm:"type:schedule_status;default:'pending_confirmation';not null" json:"status"`
	CreatedAt   time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt   time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
}

func (CounselingSchedule) TableName() string {
	return "counseling_schedules"
}
