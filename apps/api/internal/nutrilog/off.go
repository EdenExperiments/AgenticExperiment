package nutrilog

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type offClient struct {
	client *http.Client
	base   string
}

func newOFFClient() *offClient {
	return &offClient{
		client: &http.Client{Timeout: 4 * time.Second},
		base:   "https://world.openfoodfacts.org",
	}
}

type offSearchResponse struct {
	Products []struct {
		Code        string `json:"code"`
		ProductName string `json:"product_name"`
		Nutriments  struct {
			Kcal     float64 `json:"energy-kcal_100g"`
			Proteins float64 `json:"proteins_100g"`
			Carbs    float64 `json:"carbohydrates_100g"`
			Fat      float64 `json:"fat_100g"`
		} `json:"nutriments"`
	} `json:"products"`
}

func (c *offClient) Search(ctx context.Context, query string) ([]Food, error) {
	q := strings.TrimSpace(query)
	if q == "" {
		return []Food{}, nil
	}
	u := c.base + "/cgi/search.pl?search_simple=1&action=process&json=1&page_size=10&search_terms=" + url.QueryEscape(q)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "LifeQuest-NutriLog/1.0")
	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("off status %d", resp.StatusCode)
	}
	var parsed offSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return nil, err
	}
	out := []Food{}
	for _, p := range parsed.Products {
		name := strings.TrimSpace(p.ProductName)
		if name == "" {
			continue
		}
		offID := p.Code
		out = append(out, Food{
			OffID:        &offID,
			Name:         name,
			Calories:     int(p.Nutriments.Kcal + 0.5),
			ProteinG:     p.Nutriments.Proteins,
			CarbsG:       p.Nutriments.Carbs,
			FatG:         p.Nutriments.Fat,
			ServingLabel: "100 g",
		})
	}
	return out, nil
}
