package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"reflect"
	"time"

	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/nutrilog"
)

// weightStoreAdapter bridges test stubs that return local mirror types to nutrilog.WeightLog.
type weightStoreAdapter struct {
	v reflect.Value
}

func adaptWeightStore(store any) NutrilogWeightStore {
	if s, ok := store.(NutrilogWeightStore); ok {
		return s
	}
	return &weightStoreAdapter{v: reflect.ValueOf(store)}
}

func (a *weightStoreAdapter) CreateWeightLog(ctx context.Context, userID uuid.UUID, weightKg float64, note string, measuredAt time.Time) (*nutrilog.WeightLog, error) {
	out, err := a.call(ctx, "CreateWeightLog", userID, weightKg, note, measuredAt)
	if err != nil {
		return nil, err
	}
	if out == nil {
		return nil, nil
	}
	log, err := decodeWeightLog(out)
	if err != nil {
		return nil, err
	}
	return &log, nil
}

func (a *weightStoreAdapter) ListWeightLogs(ctx context.Context, userID uuid.UUID, limit int) ([]nutrilog.WeightLog, error) {
	out, err := a.call(ctx, "ListWeightLogs", userID, limit)
	if err != nil {
		return nil, err
	}
	return decodeWeightLogSlice(out)
}

func (a *weightStoreAdapter) GetWeightLogsInRange(ctx context.Context, userID uuid.UUID, days int) ([]nutrilog.WeightLog, error) {
	out, err := a.call(ctx, "GetWeightLogsInRange", userID, days)
	if err != nil {
		return nil, err
	}
	return decodeWeightLogSlice(out)
}

func (a *weightStoreAdapter) DeleteWeightLog(ctx context.Context, userID, logID uuid.UUID) error {
	_, err := a.call(ctx, "DeleteWeightLog", userID, logID)
	return err
}

func (a *weightStoreAdapter) call(ctx context.Context, method string, args ...any) (any, error) {
	m := a.v.MethodByName(method)
	if !m.IsValid() {
		return nil, fmt.Errorf("nutrilog weight store missing method %s", method)
	}
	in := make([]reflect.Value, 0, len(args)+1)
	in = append(in, reflect.ValueOf(ctx))
	for _, arg := range args {
		in = append(in, reflect.ValueOf(arg))
	}
	results := m.Call(in)
	if len(results) == 1 {
		if err, ok := results[0].Interface().(error); ok && err != nil {
			return nil, err
		}
		return nil, nil
	}
	if len(results) == 2 && !results[1].IsNil() {
		if err, ok := results[1].Interface().(error); ok {
			return nil, err
		}
	}
	if len(results) == 0 {
		return nil, nil
	}
	if results[0].IsNil() {
		return nil, nil
	}
	return results[0].Interface(), nil
}

func decodeWeightLog(v any) (nutrilog.WeightLog, error) {
	var log nutrilog.WeightLog
	if err := decodeViaJSON(v, &log); err != nil {
		return log, fmt.Errorf("decode weight log: %w", err)
	}
	return log, nil
}

func decodeWeightLogSlice(v any) ([]nutrilog.WeightLog, error) {
	if v == nil {
		return []nutrilog.WeightLog{}, nil
	}
	var logs []nutrilog.WeightLog
	if err := decodeViaJSON(v, &logs); err != nil {
		return nil, fmt.Errorf("decode weight logs: %w", err)
	}
	if logs == nil {
		return []nutrilog.WeightLog{}, nil
	}
	return logs, nil
}

func decodeViaJSON(src any, dst any) error {
	b, err := json.Marshal(src)
	if err != nil {
		return err
	}
	return json.Unmarshal(b, dst)
}
