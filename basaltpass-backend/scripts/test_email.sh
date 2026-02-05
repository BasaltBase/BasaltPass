#!/bin/bash
# BasaltPass Email Test Script
# 此脚本用于快速测试邮件发送功能

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== BasaltPass Email Test Script ===${NC}\n"

# 检查 email-test 工具是否存在
if [ ! -f "./email-test" ]; then
    echo -e "${YELLOW}Building email-test tool...${NC}"
    go build -buildvcs=false -o email-test ./cmd/email_test
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to build email-test tool${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Build successful${NC}\n"
fi

# 显示菜单
echo "Please select an option:"
echo "1) Verify email configuration"
echo "2) Send test email"
echo "3) Send test email with custom provider"
echo "4) Exit"
echo ""
read -p "Enter your choice [1-4]: " choice

case $choice in
    1)
        echo -e "\n${YELLOW}Verifying email configuration...${NC}\n"
        ./email-test -verify
        ;;
    2)
        read -p "Enter sender email: " from
        read -p "Enter recipient email: " to
        read -p "Enter subject (or press Enter for default): " subject
        
        if [ -z "$subject" ]; then
            ./email-test -from "$from" -to "$to"
        else
            ./email-test -from "$from" -to "$to" -subject "$subject"
        fi
        ;;
    3)
        echo "Available providers: smtp, aws_ses, brevo, mailgun"
        read -p "Enter provider: " provider
        read -p "Enter sender email: " from
        read -p "Enter recipient email: " to
        
        ./email-test -provider "$provider" -from "$from" -to "$to"
        ;;
    4)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Test complete!${NC}"
