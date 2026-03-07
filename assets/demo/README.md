# demo backup video

- file: `backup-demo-3min.mp4`
- duration: 3 minutes (180s)
- purpose: fallback presentation asset if live APIs fail during judging/demo

## regeneration

run from repo root:

- `ffmpeg -y -f lavfi -i "color=c=0x05070f:s=1280x720:d=60" -vf "drawtext=font='Arial':text='Shams-E Backup Demo':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=220,drawtext=font='Arial':text='Flow 1 Zero to Store':fontcolor=cyan:fontsize=42:x=(w-text_w)/2:y=330,drawtext=font='Arial':text='Generate listing then create product':fontcolor=white:fontsize=34:x=(w-text_w)/2:y=390" -c:v libx264 -pix_fmt yuv420p -r 30 -t 60 "assets/demo/segment1.mp4"`
- `ffmpeg -y -f lavfi -i "color=c=0x0b1220:s=1280x720:d=60" -vf "drawtext=font='Arial':text='Flow 2 and Flow 3':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=220,drawtext=font='Arial':text='Market and competitor analysis':fontcolor=violet:fontsize=40:x=(w-text_w)/2:y=330,drawtext=font='Arial':text='Inventory and orders checks':fontcolor=lime:fontsize=38:x=(w-text_w)/2:y=390" -c:v libx264 -pix_fmt yuv420p -r 30 -t 60 "assets/demo/segment2.mp4"`
- `ffmpeg -y -f lavfi -i "color=c=0x111827:s=1280x720:d=60" -vf "drawtext=font='Arial':text='Flow 4 and Reliability':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=220,drawtext=font='Arial':text='Launch copy and discount support':fontcolor=pink:fontsize=38:x=(w-text_w)/2:y=330,drawtext=font='Arial':text='Use this backup when live APIs fail':fontcolor=yellow:fontsize=34:x=(w-text_w)/2:y=390" -c:v libx264 -pix_fmt yuv420p -r 30 -t 60 "assets/demo/segment3.mp4"`
- create `assets/demo/concat.txt` with:
  - `file 'segment1.mp4'`
  - `file 'segment2.mp4'`
  - `file 'segment3.mp4'`
- `ffmpeg -y -f concat -safe 0 -i "assets/demo/concat.txt" -c copy "assets/demo/backup-demo-3min.mp4"`
- optional cleanup: delete `segment*.mp4` and `concat.txt`
