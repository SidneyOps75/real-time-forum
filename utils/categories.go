package utils

import (
	"fmt"

	"real/db"
	"real/models"
)

func FetchCategories() ([]models.Category, error) {
	rows, err := db.DB.Query("SELECT category_id, name, description FROM categories ORDER BY name")
	if err != nil {
		return nil, fmt.Errorf("error executing query: %w", err)
	}
	defer rows.Close()

	var categories []models.Category
	for rows.Next() {
		var category models.Category
		if err := rows.Scan(&category.CategoryID, &category.Name, &category.Description); err != nil {
			return nil, fmt.Errorf("error scanning category: %w", err)
		}
		categories = append(categories, category)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}

	return categories, nil
}
