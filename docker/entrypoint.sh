#!/bin/sh
# 容器启动入口：把需要持久化的目录挂上卷后，空卷则灌入镜像内初始数据
# 即使本脚本未执行，应用也会尝试从 /app/seed/data 读取 content.json
set -e

SEED=/app/seed
APP=/app

echo "[entrypoint] cwd=$APP seed=$SEED"
echo "[entrypoint] 检查持久化目录..."

# ---------- data（content.json / path-map.json / .env.local）----------
mkdir -p "$APP/data"
NEED_SEED=0
if [ ! -f "$APP/data/content.json" ]; then
  NEED_SEED=1
elif [ ! -s "$APP/data/content.json" ]; then
  # 0 字节文件也视为损坏，重新灌种
  echo "[entrypoint] content.json 为空文件，重新灌种"
  NEED_SEED=1
fi
if [ "$NEED_SEED" = "1" ]; then
  echo "[entrypoint] data 缺少有效 content.json，写入初始数据"
  cp -a "$SEED/data/." "$APP/data/"
fi
# 密码等写到 data/.env.local，随 data 卷一起持久
if [ ! -f "$APP/data/.env.local" ]; then
  if [ -f "$SEED/.env.local" ]; then
    echo "[entrypoint] 初始化 data/.env.local"
    cp "$SEED/.env.local" "$APP/data/.env.local"
  elif [ -f "$APP/.env.local" ]; then
    cp "$APP/.env.local" "$APP/data/.env.local"
  fi
fi
# 根目录软链，兼容仍读 /.env.local 的工具
if [ -f "$APP/data/.env.local" ]; then
  ln -sfn "$APP/data/.env.local" "$APP/.env.local"
fi

# ---------- 上传图 ----------
mkdir -p "$APP/public/uploads"
if [ -z "$(ls -A "$APP/public/uploads" 2>/dev/null)" ]; then
  if [ -d "$SEED/public/uploads" ] && [ -n "$(ls -A "$SEED/public/uploads" 2>/dev/null)" ]; then
    echo "[entrypoint] uploads 为空，写入初始文件"
    cp -a "$SEED/public/uploads/." "$APP/public/uploads/"
  fi
fi

# ---------- 视频（含仓库自带演示视频）----------
mkdir -p "$APP/public/videos"
if [ -z "$(ls -A "$APP/public/videos" 2>/dev/null)" ]; then
  if [ -d "$SEED/public/videos" ] && [ -n "$(ls -A "$SEED/public/videos" 2>/dev/null)" ]; then
    echo "[entrypoint] videos 为空，写入初始视频"
    cp -a "$SEED/public/videos/." "$APP/public/videos/"
  fi
fi

# 卷常由 root 挂载，改回应用用户可写
chown -R nextjs:nodejs "$APP/data" "$APP/public/uploads" "$APP/public/videos" 2>/dev/null || true

if [ -f "$APP/data/content.json" ]; then
  echo "[entrypoint] content.json OK ($(wc -c < "$APP/data/content.json") bytes)"
else
  echo "[entrypoint] WARNING: content.json 仍不存在，将依赖应用层 seed 兜底"
fi

echo "[entrypoint] 启动应用: $*"
exec su-exec nextjs "$@"
