module txbuilder

go 1.25.3

replace github.com/canopy-network/canopy => ../../canopy

replace github.com/canopy-network/go-plugin => ../../canopy/plugin/go

require (
	github.com/canopy-network/go-plugin v0.0.0-00010101000000-000000000000
	github.com/drand/kyber v1.3.2
	github.com/drand/kyber-bls12381 v0.3.4
	google.golang.org/protobuf v1.36.11
)

require (
	github.com/kilic/bls12-381 v0.1.0 // indirect
	golang.org/x/crypto v0.46.0 // indirect
	golang.org/x/sys v0.39.0 // indirect
)
