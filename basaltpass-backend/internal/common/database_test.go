package common

import (
	"gorm.io/gorm"
	"reflect"
	"testing"
)

func TestDB(t *testing.T) {
	tests := []struct {
		name string
		want *gorm.DB
	}{
		// TODO: Add test cases.
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := DB(); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("DB() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestSetDBForTest(t *testing.T) {
	type args struct {
		testDB *gorm.DB
	}
	tests := []struct {
		name string
		args args
	}{
		// TODO: Add test cases.
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			SetDBForTest(tt.args.testDB)
		})
	}
}
