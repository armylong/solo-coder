package cmd

import (
	"fmt"

	"github.com/urfave/cli/v2"
)

// solo coder会话命令（开发中）
func SoloCoderSessionHandler(c *cli.Context) error {
	id := c.String("id")
	if id == "" {
		return fmt.Errorf("题目ID不能为空")
	}

	// /Users/zhangzelong/Library/Application Support/Trae CN/User/workspaceStorage/

	// _, err := sqlite.DB.DB().Exec(sql)
	// if err != nil {
	// 	return fmt.Errorf("sqlite exec error: %v", err)
	// }

	return nil
}
