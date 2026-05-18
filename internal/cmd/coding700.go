package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/spf13/cast"
	"github.com/urfave/cli/v2"
)

const (
	workHome         = "/Users/zhangzelong/works/coding700"
	defaultImageName = "repo"
)

type container struct {
	Name        string
	SshPort     int
	HttpPort    int
	DevHttpPort int
	ModelName   string
	RolloutId   int
}

var Containers []container = []container{
	{
		Name:        "2221",
		SshPort:     2221,
		HttpPort:    8001,
		DevHttpPort: 9001,
		ModelName:   "Doubao-Seed-2.0-Code",
		RolloutId:   1,
	},
	{
		Name:        "2222",
		SshPort:     2222,
		HttpPort:    8002,
		DevHttpPort: 9002,
		ModelName:   "gpt-5.4",
		RolloutId:   2,
	},
	{
		Name:        "2223",
		SshPort:     2223,
		HttpPort:    8003,
		DevHttpPort: 9003,
		ModelName:   "gemini-3.1-p",
		RolloutId:   3,
	},
	{
		Name:        "2224",
		SshPort:     2224,
		HttpPort:    8004,
		DevHttpPort: 9004,
		ModelName:   "DeepSeek-v4-Pro",
		RolloutId:   4,
	},
	{
		Name:        "2225",
		SshPort:     2225,
		HttpPort:    8005,
		DevHttpPort: 9005,
		ModelName:   "MinMax-M2.7,GLM-5.1,Qwen3.6-Plus",
		RolloutId:   5,
	},
}

func Coding700Handler(c *cli.Context) error {
	return nil
}

func Coding700InitHandler(c *cli.Context) error {
	baseProjectName := c.String(`base`)
	projectName := c.String(`project`)

	if baseProjectName == "" && projectName == "" {
		return fmt.Errorf("基础项目名称和项目名称不能为空")
	}

	if baseProjectName != `` {
		return cpHandler(baseProjectName)
	} else {
		imageName := c.String(`image`)
		return initHandler(projectName, imageName)
	}

	return nil
}

// 拷贝项目
func cpHandler(baseProjectName string) error {
	// 拷贝 /Users/zhangzelong/works/coding700/[baseProjectName] 到 coding700目录下, 命名格式: 20260516-01(年月日-序号, 从01开始, 检测目录里已存在则序号+1)
	srcDir := filepath.Join(workHome, baseProjectName)
	if _, err := os.Stat(srcDir); os.IsNotExist(err) {
		return fmt.Errorf("源目录不存在: %s", srcDir)
	}

	dateStr := time.Now().Format("20060102")
	prefix := dateStr + "-"

	seq := 1
	entries, err := os.ReadDir(workHome)
	if err != nil {
		return fmt.Errorf("读取目录失败: %v", err)
	}
	var seqs []int
	for _, entry := range entries {
		name := entry.Name()
		if strings.HasPrefix(name, prefix) {
			parts := strings.SplitN(name, "-", 2)
			if len(parts) == 2 {
				if n, err := strconv.Atoi(parts[1]); err == nil {
					seqs = append(seqs, n)
				}
			}
		}
	}
	if len(seqs) > 0 {
		sort.Ints(seqs)
		seq = seqs[len(seqs)-1] + 1
	}

	// 拷贝目录
	dstDir := filepath.Join(workHome, fmt.Sprintf("%s%02d", prefix, seq))
	cmd := exec.Command("cp", "-r", srcDir, dstDir)
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("拷贝目录失败: %v, output: %s", err, string(output))
	}

	// 删除git标识
	gitDir := filepath.Join(dstDir, "repo", ".git")
	fmt.Printf("gitDir: %s\n", gitDir)
	if _, err := os.Stat(gitDir); err == nil {
		os.RemoveAll(gitDir)
	}
	fmt.Printf("拷贝成功: %s -> %s\n", srcDir, dstDir)

	return nil
}

// 初始化项目
func initHandler(projectName string, imageName string) error {
	// 默认都在这个目录进行操作 workHome/[projectName]/repo
	projectDir := filepath.Join(workHome, projectName)
	repoDir := filepath.Join(projectDir, "repo")
	if _, err := os.Stat(repoDir); os.IsNotExist(err) {
		return fmt.Errorf("仓库目录不存在: %s", repoDir)
	}

	// 删除远程仓库 gh repo delete armylong/longt --yes
	cmd := exec.Command("gh", "api", "repos/armylong/"+projectName)
	output, err := cmd.CombinedOutput()
	if err == nil {
		cmd = exec.Command("gh", "repo", "delete", "armylong/"+projectName, "--yes")
		cmd.Dir = repoDir
		if output, err := cmd.CombinedOutput(); err != nil {
			return fmt.Errorf("gh repo delete 失败: %v, output: %s", err, string(output))
		}
		fmt.Printf("gh repo delete 成功: armylong/%s\n", projectName)
	} else {
		if strings.Contains(string(output), "404") {
			fmt.Printf("远程仓库不存在: armylong/%s\n", projectName)
		} else {
			return fmt.Errorf("gh api 查询仓库失败: %v, output: %s", err, string(output))
		}
	}

	// 删除.git目录
	gitDir := filepath.Join(repoDir, ".git")
	os.RemoveAll(gitDir)
	fmt.Printf("git目录删除成功: %s\n", gitDir)

	// 初始化git仓库: git init
	cmd = exec.Command("git", "init")
	cmd.Dir = repoDir
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("git init 失败: %v, output: %s", err, string(output))
	}
	fmt.Printf("git init 成功: %s\n", repoDir)

	// 添加所有文件到git仓库: git add .
	cmd = exec.Command("git", "add", ".")
	cmd.Dir = repoDir
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("git add 失败: %v, output: %s", err, string(output))
	}
	fmt.Printf("git add 成功: %s\n", repoDir)

	// 提交所有文件到git仓库: git commit -m "first commit"
	cmd = exec.Command("git", "commit", "-m", "first commit")
	cmd.Dir = repoDir
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("git commit 失败: %v, output: %s", err, string(output))
	}
	fmt.Printf("git commit 成功: %s\n", repoDir)

	// 推送本地仓库到github: gh repo create [projectName] --public --source=. --push
	cmd = exec.Command("gh", "repo", "create", projectName, "--public", "--source=.", "--push")
	cmd.Dir = repoDir
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("gh repo create 失败: %v, output: %s", err, string(output))
	}
	fmt.Printf("gh repo create 成功: %s\n", repoDir)

	// 删除所有容器 docker rm -f $(docker ps -aq)
	exec.Command("sh", "-c", "docker rm -f $(docker ps -aq)").Run()
	fmt.Printf("所有容器删除成功\n")

	// 删除所有没有tag且最近未使用的镜像 docker image prune -f
	exec.Command("sh", "-c", "docker image prune -f").Run()
	fmt.Printf("所有无用镜像清理成功\n")

	// 如果imageName不为空, 则构建镜像(构建前删除旧的同名镜像): docker build -t repo .
	if imageName != "" {
		exec.Command("docker", "rmi", "-f", imageName).Run()
	} else {
		imageName = defaultImageName
	}

	// 如果镜像不存在, 则构建
	if err := exec.Command("docker", "image", "inspect", imageName).Run(); err != nil {
		cmd = exec.Command("docker", "build", "-t", imageName, "-f", "Dockerfile.dev", ".")
		cmd.Dir = projectDir
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("docker build 失败: %v", err)
		}
		fmt.Printf("镜像构建成功: %s\n", imageName)
	} else {
		fmt.Printf("镜像已存在, 跳过构建: %s\n", imageName)
	}

	// 启动五个docker容器
	// docker run -d -p 8001:80 -p 2221:22 --name 2221 [repoName]
	// docker run -d -p 8002:80 -p 2222:22 --name 2222 [repoName]
	// docker run -d -p 8003:80 -p 2223:22 --name 2223 [repoName]
	// docker run -d -p 8004:80 -p 2224:22 --name 2224 [repoName]
	// docker run -d -p 8005:80 -p 2225:22 --name 2225 [repoName]
	containerNames := []string{}
	for _, container := range Containers {
		sshPort := container.SshPort
		httpPort := container.HttpPort
		devHttpPort := container.DevHttpPort
		if err := createContainer(container.Name, imageName, httpPort, sshPort, devHttpPort); err != nil {
			return err
		}
		containerNames = append(containerNames, container.Name)
		fmt.Printf("容器启动成功: %s (http=%d, ssh=%d, devHttp=%d)\n", container.Name, httpPort, sshPort, devHttpPort)
	}

	// 获取远程仓库url gh repo view armylong/20260516-01 --json url --jq .url
	remoteRepoUrl := ""
	cmd = exec.Command("gh", "repo", "view", "armylong/"+projectName, "--json", "url", "--jq", ".url")
	if output, err := cmd.CombinedOutput(); err == nil {
		remoteRepoUrl = strings.TrimSpace(string(output))
	}

	// 将repo目录压缩zip（解压后直接是代码文件，不含repo目录层）
	zipFile := filepath.Join(projectDir, "repo.zip")
	cmd = exec.Command("zip", "-r", zipFile, ".")
	cmd.Dir = repoDir
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("压缩repo目录失败: %v, output: %s", err, string(output))
	}
	fmt.Printf("repo.zip压缩成功: %s\n", zipFile)

	// 将重要数据写入到 projectDir 的 project.json中
	projectJson := map[string]string{
		"project_name":      projectName,
		"repo_url":          remoteRepoUrl,
		"docker_image":      imageName,
		"docker_containers": strings.Join(containerNames, ","),
	}
	projectJsonFile := filepath.Join(projectDir, "project.json")
	projectJsonData, err := json.MarshalIndent(projectJson, "", "  ")
	if err != nil {
		return fmt.Errorf("写入project.json失败: %v", err)
	}
	if err = os.WriteFile(projectJsonFile, projectJsonData, 0644); err != nil {
		return fmt.Errorf("写入project.json失败: %v", err)
	}

	// 写入repo.json
	repoJson := map[string]string{
		"repo_url":          remoteRepoUrl,
		"repo_type":         "公有仓库",
		"language":          "golang",
		"task_count":        "7",
		"dockerfile":        "",
		"repo":              "",
		"environment_notes": "",
	}
	repoJsonFile := filepath.Join(projectDir, "repo.json")
	repoJsonData, err := json.MarshalIndent(repoJson, "", "  ")
	if err != nil {
		return fmt.Errorf("写入repo.json失败: %v", err)
	}
	if err = os.WriteFile(repoJsonFile, repoJsonData, 0644); err != nil {
		return fmt.Errorf("写入repo.json失败: %v", err)
	}

	return nil
}

// 重置某个容器
func Coding700ResetHandler(c *cli.Context) error {
	// projectName := c.String(`project`)
	// if projectName == "" {
	// 	return fmt.Errorf("project is required")
	// }
	containersStr := c.String(`container`)

	var containerNames []string
	if containersStr == "" {
		for _, container := range Containers {
			containerNames = append(containerNames, container.Name)
		}
	} else {
		containerNames = strings.Split(containersStr, ",")
	}

	// 重启容器
	for _, containerName := range containerNames {
		// 获取容器的镜像名称
		output, err := exec.Command("docker", "inspect", "--format={{.Config.Image}}", containerName).Output()
		if err != nil {
			return fmt.Errorf("获取容器 %s 镜像名称失败: %v", containerName, err)
		}
		imageName := strings.TrimSpace(string(output))

		// 获取容器的端口映射（通过inspect获取，停止的容器也能查到）
		portOutput, err := exec.Command("docker", "inspect", "--format={{range $p, $conf := .HostConfig.PortBindings}}{{if $conf}}-p {{(index $conf 0).HostPort}}:{{$p}} {{end}}{{end}}", containerName).Output()
		if err != nil {
			return fmt.Errorf("获取容器 %s 端口映射失败: %v", containerName, err)
		}
		ports := strings.TrimSpace(string(portOutput))
		fmt.Printf("容器 %s 镜像: %s, 端口: %s\n", containerName, imageName, ports)

		var httpPort, sshPort, devHttpPort int
		for _, item := range strings.Split(ports, " ") {
			item = strings.TrimSpace(item)
			if item == "" || item == "-p" {
				continue
			}
			// 格式: 2221:22/tcp
			if !strings.Contains(item, ":") || !strings.Contains(item, "/tcp") {
				continue
			}
			mappingParts := strings.SplitN(item, ":", 2)
			if len(mappingParts) != 2 {
				continue
			}
			hostPort, err := strconv.Atoi(mappingParts[0])
			if err != nil {
				continue
			}
			containerPort := strings.Split(mappingParts[1], "/")[0]

			switch containerPort {
			case "80":
				httpPort = hostPort
			case "22":
				sshPort = hostPort
			}
		}
		if httpPort == 0 || sshPort == 0 {
			return fmt.Errorf("容器 %s 端口映射错误", containerName)
		}

		// 删除旧容器
		if err := exec.Command("docker", "rm", "-f", containerName).Run(); err != nil {
			return fmt.Errorf("删除容器 %s 失败: %v", containerName, err)
		}

		// 创建容器
		switch httpPort {
		case 8001:
			devHttpPort = 9001
		case 8002:
			devHttpPort = 9002
		case 8003:
			devHttpPort = 9003
		case 8004:
			devHttpPort = 9004
		case 8005:
			devHttpPort = 9005
		default:
			return fmt.Errorf("容器 %s 端口映射错误", containerName)
		}
		if err := createContainer(containerName, imageName, httpPort, sshPort, devHttpPort); err != nil {
			return err
		}

		fmt.Printf("容器 %s 重置成功启动 (http=%d, ssh=%d, devHttp=%d)\n", containerName, httpPort, sshPort, devHttpPort)
	}

	return nil
}

// 创建容器
func createContainer(containerName, imageName string, httpPort, sshPort, devHttpPort int) error {
	if output, err := exec.Command("docker", "run", "-d",
		"-p", fmt.Sprintf("%d:80", httpPort),
		"-p", fmt.Sprintf("%d:22", sshPort),
		"-p", fmt.Sprintf("%d:81", devHttpPort),
		"--name", containerName,
		imageName,
	).CombinedOutput(); err != nil {
		return fmt.Errorf("docker run %s 失败: %v, output: %s", containerName, err, string(output))
	}
	// 将容器内的环境变量写入/etc/profile.d/docker-env.sh, 使SSH登录后也能读取
	if output, err := exec.Command("docker", "exec", containerName, "sh", "-c",
		"export -p > /etc/profile.d/docker-env.sh",
	).CombinedOutput(); err != nil {
		return fmt.Errorf("导出环境变量到 %s 失败: %v, output: %s", containerName, err, string(output))
	}
	return nil
}

// 收集任务成果 collectTaskResults
func Coding700CollectTaskResultsHandler(c *cli.Context) error {

	projectName := c.String(`project`)
	if projectName == "" {
		return fmt.Errorf("projectName is required")
	}
	promptId := cast.ToInt(c.String(`prompt_id`))
	if promptId == 0 {
		return fmt.Errorf("请输入题目ID")
	}
	rolloutIdsStr := c.String(`rollout_id`)

	var rolloutIds []int
	if rolloutIdsStr == "" {
		for _, container := range Containers {
			rolloutIds = append(rolloutIds, container.RolloutId)
		}
	} else {
		rolloutIdsTmp := strings.Split(rolloutIdsStr, ",")
		for _, rolloutIdStr := range rolloutIdsTmp {
			rolloutId := cast.ToInt(rolloutIdStr)
			if rolloutId == 0 {
				return fmt.Errorf("rolloutId %s 格式错误", rolloutIdStr)
			}
			rolloutIds = append(rolloutIds, rolloutId)
		}
	}

	projectDir := filepath.Join(workHome, projectName)
	if _, err := os.Stat(projectDir); os.IsNotExist(err) {
		return fmt.Errorf("项目目录不存在: %s", projectDir)
	}
	// 不存在就创建提示词目录
	promptDir := filepath.Join(projectDir, fmt.Sprintf("prompt_%d", promptId))
	if _, err := os.Stat(promptDir); os.IsNotExist(err) {
		if err := os.MkdirAll(promptDir, 0755); err != nil {
			return fmt.Errorf("创建提示词目录 %s 失败: %v", promptDir, err)
		}
	}
	for _, rolloutId := range rolloutIds {
		containerName := getContainerNameByRolloutId(rolloutId)
		if containerName == "" {
			return fmt.Errorf("rolloutId %d 对应的容器不存在", rolloutId)
		}

		// 不存在就创建子任务目录
		rolloutDir := filepath.Join(promptDir, fmt.Sprintf("rollout_%d", rolloutId))
		if _, err := os.Stat(rolloutDir); os.IsNotExist(err) {
			if err := os.MkdirAll(rolloutDir, 0755); err != nil {
				return fmt.Errorf("创建子任务目录 %s 失败: %v", rolloutDir, err)
			}
		}

		// 拷贝diff文件
		patchFilePath := filepath.Join(rolloutDir, `diff.patch`)
		output, err := exec.Command("docker", "exec", containerName, "sh", "-c", "cd /app && git add -A && git diff --cached").Output()
		if err != nil {
			return fmt.Errorf("diff 失败: %v, output: %s", err, string(output))
		}
		if err := os.WriteFile(patchFilePath, output, 0644); err != nil {
			return fmt.Errorf("写入patch文件失败: %v", err)
		}
		fmt.Printf("diff文件生成 成功: %s\n", patchFilePath)

		// 拷贝/app目录
		if err := exec.Command("docker", "cp", fmt.Sprintf("%s:/app", containerName), rolloutDir).Run(); err != nil {
			return fmt.Errorf("拷贝容器 %s 的/app目录到 %s 失败: %v", containerName, rolloutDir, err)
		}
		fmt.Printf("app目录拷贝 成功: %s\n", rolloutDir)

	}

	return nil
}

func getContainerNameByRolloutId(rolloutId int) string {
	for _, container := range Containers {
		if container.RolloutId == rolloutId {
			return container.Name
		}
	}
	return ""
}
