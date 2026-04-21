package main

import (
	"bytes"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/canopy-network/go-plugin/contract"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/anypb"
)

// HTTP helper function
func postRawJSON(url string, jsonBody string) ([]byte, error) {
	resp, err := http.Post(url, "application/json", bytes.NewBufferString(jsonBody))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(respBody))
	}

	return respBody, nil
}

// getSignBytes returns the canonical bytes for signing a transaction.
// Inlined here to avoid the tutorial/contract protobuf namespace conflict.
func getSignBytes(msgType string, msg *anypb.Any, txTime, createdHeight, fee uint64, memo string, networkID, chainID uint64) ([]byte, error) {
	tx := &contract.Transaction{
		MessageType:   msgType,
		Msg:           msg,
		Signature:     nil, // omitted for signing
		CreatedHeight: createdHeight,
		Time:          txTime,
		Fee:           fee,
		Memo:          memo,
		NetworkId:     networkID,
		ChainId:       chainID,
	}
	return proto.MarshalOptions{Deterministic: true}.Marshal(tx)
}

func main() {
	rpcURL := flag.String("rpc", "http://localhost:50002", "RPC URL")
	queryPosts := flag.Bool("query-posts", false, "Query all posts from state")
	creatorAddress := flag.String("creator", "", "Creator address (hex)")
	privateKeyHex := flag.String("privkey", "", "Private key (hex)")
	content := flag.String("content", "", "Post content")
	imageUrl := flag.String("image", "", "Image URL")
	prizeTotal := flag.Uint64("prize", 0, "Prize Total")
	deadline := flag.Uint64("deadline", 0, "Deadline")
	fee := flag.Uint64("fee", 10000, "Transaction fee")
	networkID := flag.Uint64("network", 1, "Network ID")
	chainID := flag.Uint64("chain", 1, "Chain ID")

	flag.Parse()

	if *queryPosts {
		QueryPosts(*rpcURL)
		os.Exit(0)
	}

	if *creatorAddress == "" || *privateKeyHex == "" {
		fmt.Println("Missing required arguments")
		os.Exit(1)
	}

	// Get current height
	respBody, err := postRawJSON(*rpcURL+"/v1/query/height", "{}")
	if err != nil {
		fmt.Printf("Error getting height: %v\n", err)
		os.Exit(1)
	}
	var result struct {
		Height uint64 `json:"height"`
	}
	json.Unmarshal(respBody, &result)
	height := result.Height

	txTime := uint64(time.Now().UnixMicro())
	typeURL := "type.googleapis.com/types.MessageCreatePost"

	creatorBytes, _ := hex.DecodeString(*creatorAddress)

	msgProto := &contract.MessageCreatePost{
		CreatorAddress: creatorBytes,
		Content:        *content,
		ImageUrl:       *imageUrl,
		PrizeTotal:     *prizeTotal,
		Deadline:       *deadline,
	}

	msgProtoBytes, err := proto.Marshal(msgProto)
	if err != nil {
		fmt.Printf("Error marshaling proto: %v\n", err)
		os.Exit(1)
	}

	msgAny := &anypb.Any{
		TypeUrl: typeURL,
		Value:   msgProtoBytes,
	}

	signBytes, err := getSignBytes("createPost", msgAny, txTime, height, *fee, "", *networkID, *chainID)
	if err != nil {
		fmt.Printf("Error getting sign bytes: %v\n", err)
		os.Exit(1)
	}

	privKey, err := StringToBLS12381PrivateKey(*privateKeyHex)
	if err != nil {
		fmt.Printf("Error parsing private key: %v\n", err)
		os.Exit(1)
	}

	signature := privKey.Sign(signBytes)
	pubKeyBytes := privKey.PublicKey().Bytes()

	tx := map[string]interface{}{
		"type":       "createPost",
		"msgTypeUrl": typeURL,
		"msgBytes":   hex.EncodeToString(msgProtoBytes),
		"signature": map[string]string{
			"publicKey": hex.EncodeToString(pubKeyBytes),
			"signature": hex.EncodeToString(signature),
		},
		"time":          txTime,
		"createdHeight": height,
		"fee":           *fee,
		"memo":          "",
		"networkID":     *networkID,
		"chainID":       *chainID,
	}

	txJSONBytes, _ := json.MarshalIndent(tx, "", "  ")

	respBody, err = postRawJSON(*rpcURL+"/v1/tx", string(txJSONBytes))
	if err != nil {
		fmt.Printf("Error sending tx: %v\n", err)
		os.Exit(1)
	}

	var txHash string
	json.Unmarshal(respBody, &txHash)
	fmt.Print(txHash)
}
