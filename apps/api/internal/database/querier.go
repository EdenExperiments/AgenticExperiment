package database

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	_ Querier = (*pgxpool.Pool)(nil)
	_ Querier = (pgx.Tx)(nil)
)

// Querier is the minimal database surface used by repositories. Both *pgxpool.Pool
// and pgx.Tx satisfy it.
type Querier interface {
	Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

type ctxKey int

const querierKey ctxKey = iota

// WithQuerier returns a child context that carries q for this request.
func WithQuerier(ctx context.Context, q Querier) context.Context {
	return context.WithValue(ctx, querierKey, q)
}

// QuerierFromContext returns the querier stored by transaction middleware, if any.
func QuerierFromContext(ctx context.Context) (Querier, bool) {
	q, ok := ctx.Value(querierKey).(Querier)
	return q, ok
}

// MustQuerier returns the request querier or panics (middleware ordering bug).
func MustQuerier(ctx context.Context) Querier {
	q, ok := QuerierFromContext(ctx)
	if !ok || q == nil {
		panic("database: no querier in context — transaction middleware must run before handlers")
	}
	return q
}

// Begin starts a new transaction from a pool, or a nested transaction (savepoint)
// when q is already a pgx.Tx.
func Begin(ctx context.Context, q Querier) (pgx.Tx, error) {
	switch v := q.(type) {
	case *pgxpool.Pool:
		return v.Begin(ctx)
	case pgx.Tx:
		return v.Begin(ctx)
	default:
		return nil, fmt.Errorf("database.Begin: unsupported Querier type %T", q)
	}
}
