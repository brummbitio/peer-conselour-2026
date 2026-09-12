// Package templates menyematkan berkas template ke dalam binary. Image Docker
// hanya menyalin binary hasil build, sehingga template email wajib ikut di-embed.
package templates

import "embed"

//go:embed email/*.html email/*.png
var FS embed.FS
