package main

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/canopy-network/go-plugin/contract"
	"google.golang.org/protobuf/proto"
)

// PostJSON is the JSON-friendly representation of an on-chain Post
type PostJSON struct {
	ID             string `json:"id"`
	Creator        string `json:"creator"`
	Content        string `json:"content"`
	ImageURL       string `json:"image_url,omitempty"`
	PrizeTotal     uint64 `json:"prize_total"`
	PrizeLeft      uint64 `json:"prize_left"`
	Deadline       uint64 `json:"deadline"`
	CreatedAt      uint64 `json:"created_at"`
	Status         string `json:"status"`
}

// QueryPosts queries the Canopy RPC for all posts stored under the post prefix (0x08)
// and outputs decoded JSON posts to stdout.
func QueryPosts(rpcURL string) {
	resp, err := http.Get(rpcURL + "/v1/query/plugin-prefix?prefix=0108")
	if err != nil {
		fmt.Printf("[]\n")
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Printf("[]\n")
		return
	}

	var hexStrs []string
	if err := json.Unmarshal(body, &hexStrs); err != nil || len(hexStrs) == 0 {
		fmt.Println("[]")
		return
	}

	var posts []PostJSON
	for _, hexStr := range hexStrs {
		bz, err := hex.DecodeString(hexStr)
		if err != nil {
			continue
		}
		var post contract.Post
		if err := proto.Unmarshal(bz, &post); err != nil {
			continue
		}
		posts = append(posts, PostJSON{
			ID:         post.Id,
			Creator:    hex.EncodeToString(post.CreatorAddress),
			Content:    post.Content,
			ImageURL:   post.ImageUrl,
			PrizeTotal: post.PrizeTotal,
			PrizeLeft:  post.PrizeLeft,
			Deadline:   post.Deadline,
			CreatedAt:  post.CreatedAt,
			Status:     post.Status,
		})
	}

	out, err := json.Marshal(posts)
	if err != nil {
		fmt.Println("[]")
		return
	}
	fmt.Println(string(out))
}
