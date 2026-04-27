package main

import (
	"basaltpass-backend/internal/common"
	config "basaltpass-backend/internal/config"
	"basaltpass-backend/internal/model"
	"fmt"
	"log"
)

func main() {
	_, err := config.Load("C:/Users/Administrator/Desktop/WorkPlace/BasaltPass/basaltpass-backend/config/config.yaml")
	if err != nil {
		log.Fatal(err)
	}

	var client model.OAuthClient
	err = common.DB().Where("id = ?", 19).First(&client).Error
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("CLIENT_ID=%s\n", client.ClientID)
}
