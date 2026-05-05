package database

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestQuerierFromContext_Missing(t *testing.T) {
	_, ok := QuerierFromContext(context.Background())
	if ok {
		t.Fatal("expected no querier")
	}
}

func TestMustQuerier_PanicsWithoutQuerier(t *testing.T) {
	defer func() {
		if recover() == nil {
			t.Fatal("expected panic")
		}
	}()
	MustQuerier(context.Background())
}

func TestWithQuerier_RoundTrip(t *testing.T) {
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, "postgres://invalid:invalid@127.0.0.1:1/nodb")
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()

	ctx = WithQuerier(ctx, pool)
	q, ok := QuerierFromContext(ctx)
	if !ok || q != pool {
		t.Fatal("querier mismatch")
	}
}
