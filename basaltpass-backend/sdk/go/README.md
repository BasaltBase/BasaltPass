# BasaltPass S2S Go SDK (alpha)

一个最小可用的 Go SDK，用于访问 BasaltPass 的 S2S API。

## 使用

```go
package main

import (
    "context"
    "fmt"
    s2s "basaltpass-s2s"
)

func main() {
    client := s2s.New("http://localhost:8080", "your_client_id", "your_client_secret")

    user, err := client.GetUser(context.Background(), 123)
    if err != nil { panic(err) }
    fmt.Println(user)

    roles, err := client.GetUserRoles(context.Background(), 123, nil)
    if err != nil { panic(err) }
    fmt.Println(roles)

    codes, err := client.GetUserRoleCodes(context.Background(), 123, nil)
    if err != nil { panic(err) }
    fmt.Println(codes)

    limit := 10
    wallet, err := client.GetUserWallet(context.Background(), 123, "CNY", &limit)
    if err != nil { panic(err) }
    fmt.Println(wallet)
}
```

> 注意：SDK 模块名当前为 `basaltpass-s2s`，若作为子模块使用可通过 `replace` 指向本地路径。
