/* 12-2 interface languages. User content is never sent to a translation service. */
(function () {
  'use strict';
  var labels = {
"Аудио нэмэх":["Add audio", "添加音频"],"Аудио сан":["Audio library", "音频库"],"Дуу хайлт":["Song search", "歌曲搜索"],"Шилжилт":["Transition", "过渡"],"Чиний плейлист. Тасралтгүй аялгуу. Хамтдаа сонсоё.":["Your playlist. A continuous flow. Listen together.", "你的播放列表。音乐不停。一起聆听。"],"Одоо сонсох дараалал":["Play queue", "播放队列"],"Smart Mix нь аудио сангийн дуунуудыг холино.":["Smart Mix blends tracks from the audio library.", "Smart Mix 混合音频库中的歌曲。"],"Аудио сангаас дуу, дуучин хайх…":["Search your audio library…", "搜索音频库…"],
  "Хуваарь": [
    "Schedule",
    "课程表"
  ],
  "Дугуйлан": [
    "Clubs",
    "社团"
  ],
  "Цомог": [
    "Album",
    "相册"
  ],
  "Хавтас": [
    "Folders",
    "文件夹"
  ],
  "СУРАХ БИЧИГ": [
    "TEXTBOOKS",
    "教科书"
  ],
  "Сурах бичиг": [
    "Textbooks",
    "教科书"
  ],
  "DOODLE": [
    "DOODLE",
    "涂鸦"
  ],
  "САМБАР": [
    "Whiteboard",
    "白板"
  ],
  "Music": [
    "Music",
    "音乐"
  ],
  "Photobooth": [
    "Photobooth",
    "拍照亭"
  ],
  "AI CHAT": [
    "AI CHAT",
    "AI 聊天"
  ],
  "Нүүр": [
    "Home",
    "首页"
  ],
  "Нүүр хуудас": [
    "Home page",
    "首页"
  ],
  "Хэсгүүд": [
    "Sections",
    "栏目"
  ],
  "Удирдлага": [
    "Administration",
    "管理"
  ],
  "Нээх": [
    "Open",
    "打开"
  ],
  "Хаах": [
    "Close",
    "关闭"
  ],
  "Цуцлах": [
    "Cancel",
    "取消"
  ],
  "Болих": [
    "Cancel",
    "取消"
  ],
  "Тийм": [
    "Yes",
    "是"
  ],
  "Үгүй": [
    "No",
    "否"
  ],
  "Хадгалах": [
    "Save",
    "保存"
  ],
  "Хайх": [
    "Search",
    "搜索"
  ],
  "Нэмэх": [
    "Add",
    "添加"
  ],
  "Засах": [
    "Edit",
    "编辑"
  ],
  "Устгах": [
    "Delete",
    "删除"
  ],
  "Устгасан": [
    "Deleted",
    "已删除"
  ],
  "Сэргээх": [
    "Restore",
    "恢复"
  ],
  "Буцаах": [
    "Undo",
    "撤销"
  ],
  "Татах": [
    "Download",
    "下载"
  ],
  "Татах (ZIP)": [
    "Download (ZIP)",
    "下载（ZIP）"
  ],
  "ZIP татах": [
    "Download ZIP",
    "下载 ZIP"
  ],
  "Хуулах": [
    "Copy",
    "复制"
  ],
  "Хуулсан": [
    "Copied",
    "已复制"
  ],
  "Солих": [
    "Change",
    "更换"
  ],
  "Сонгох": [
    "Select",
    "选择"
  ],
  "Бүгдийг сонгох": [
    "Select all",
    "全选"
  ],
  "Бүгд": [
    "All",
    "全部"
  ],
  "Минийх": [
    "Mine",
    "我的"
  ],
  "Шинэ": [
    "New",
    "新建"
  ],
  "Шинэчлэх": [
    "Refresh",
    "刷新"
  ],
  "Ачаалж байна…": [
    "Loading…",
    "正在加载…"
  ],
  "Ачаалж байна...": [
    "Loading…",
    "正在加载…"
  ],
  "Ачаалж байна": [
    "Loading",
    "正在加载"
  ],
  "Дахин оролдох": [
    "Try again",
    "重试"
  ],
  "Дахин хадгалах": [
    "Save again",
    "重新保存"
  ],
  "Шалгаж байна": [
    "Checking",
    "正在检查"
  ],
  "Зогсоох": [
    "Stop",
    "停止"
  ],
  "Нэвтрэх": [
    "Sign in",
    "登录"
  ],
  "Гарах": [
    "Sign out",
    "退出登录"
  ],
  "Түгжих": [
    "Lock",
    "锁定"
  ],
  "Кодоор нээх": [
    "Unlock with code",
    "输入密码解锁"
  ],
  "Нэр": [
    "Name",
    "名称"
  ],
  "Тайлбар": [
    "Description",
    "说明"
  ],
  "Төрөл": [
    "Type",
    "类型"
  ],
  "Өнгө": [
    "Color",
    "颜色"
  ],
  "Хэмжээ": [
    "Size",
    "大小"
  ],
  "Эргэлт": [
    "Rotation",
    "旋转"
  ],
  "Танхим": [
    "Room",
    "教室"
  ],
  "Багш": [
    "Teacher",
    "老师"
  ],
  "Даасан багш": [
    "Homeroom teacher",
    "班主任"
  ],
  "Сургууль": [
    "School",
    "学校"
  ],
  "Анги": [
    "Class",
    "班级"
  ],
  "анги": [
    "class",
    "班"
  ],
  "анги болон түвшний нийтлэг хичээлүүд": [
    "Shared classes and level lessons",
    "班级及分层课程"
  ],
  "Хичээл": [
    "Lesson",
    "课程"
  ],
  "Хичээлийн хуваарь": [
    "Class timetable",
    "课程表"
  ],
  "Хичээлийн жил, улирал": [
    "School year and term",
    "学年与学期"
  ],
  "Хичээлийн жил": [
    "School year",
    "学年"
  ],
  "Хичээл нэмэх": [
    "Add lesson",
    "添加课程"
  ],
  "Хуваарь оруулах": [
    "Import timetable",
    "导入课程表"
  ],
  "Хуваарь устгах": [
    "Delete timetable",
    "删除课程表"
  ],
  "Хуваарь харах": [
    "View timetable",
    "查看课程表"
  ],
  "Хуваарийн харагдац": [
    "Timetable view",
    "课程表视图"
  ],
  "Хуваарь олдсонгүй": [
    "No timetable found",
    "未找到课程表"
  ],
  "Сургуулийн эх хуваарь (PDF)": [
    "Original school timetable (PDF)",
    "学校原始课程表（PDF）"
  ],
  "Хонхны цаг": [
    "Bell times",
    "上课时间"
  ],
  "Цаг нэмэх": [
    "Add period",
    "添加课时"
  ],
  "Сүүлийн цагийг хасах": [
    "Remove last period",
    "移除最后一节课"
  ],
  "Цаг бүрийн эхлэх, дуусах хугацаа.": [
    "Start and end time of each period.",
    "每节课的开始和结束时间。"
  ],
  "Өнөөдөр": [
    "Today",
    "今天"
  ],
  "Маргааш": [
    "Tomorrow",
    "明天"
  ],
  "Өчигдөр": [
    "Yesterday",
    "昨天"
  ],
  "Долоо хоног": [
    "Week",
    "本周"
  ],
  "Долоо хоногийн хуваарь": [
    "Weekly timetable",
    "每周课程表"
  ],
  "Даваа": [
    "Monday",
    "星期一"
  ],
  "Мягмар": [
    "Tuesday",
    "星期二"
  ],
  "Лхагва": [
    "Wednesday",
    "星期三"
  ],
  "Пүрэв": [
    "Thursday",
    "星期四"
  ],
  "Баасан": [
    "Friday",
    "星期五"
  ],
  "Бямба": [
    "Saturday",
    "星期六"
  ],
  "Ням": [
    "Sunday",
    "星期日"
  ],
  "Да": [
    "Mon",
    "周一"
  ],
  "Мя": [
    "Tue",
    "周二"
  ],
  "Лх": [
    "Wed",
    "周三"
  ],
  "Пү": [
    "Thu",
    "周四"
  ],
  "Ба": [
    "Fri",
    "周五"
  ],
  "Бя": [
    "Sat",
    "周六"
  ],
  "Ня": [
    "Sun",
    "周日"
  ],
  "Сайн байна уу!": [
    "Hello!",
    "你好！"
  ],
  "Өглөөний мэнд!": [
    "Good morning!",
    "早上好！"
  ],
  "Өдрийн мэнд!": [
    "Good afternoon!",
    "下午好！"
  ],
  "Оройн мэнд!": [
    "Good evening!",
    "晚上好！"
  ],
  "Өдрийн мэнд": [
    "Good afternoon",
    "下午好"
  ],
  "Өглөөний мэнд": [
    "Good morning",
    "早上好"
  ],
  "Оройн мэнд": [
    "Good evening",
    "晚上好"
  ],
  "Амралтын өдөр": [
    "Day off",
    "休息日"
  ],
  "Хичээлгүй өдөр": [
    "No classes today",
    "今天没有课程"
  ],
  "Хичээл дууссан": [
    "Classes finished",
    "课程已结束"
  ],
  "Одоо": [
    "Now",
    "现在"
  ],
  "Дараа нь": [
    "Next",
    "接下来"
  ],
  "Дараагийн хичээл": [
    "Next lesson",
    "下一节课"
  ],
  "Явагдаж байна": [
    "In progress",
    "正在进行"
  ],
  "Эхлэх хүртэл": [
    "Starts in",
    "距离开始"
  ],
  "Дуусах хүртэл": [
    "Ends in",
    "距离结束"
  ],
  "дуусах хүртэл": [
    "until it ends",
    "距离结束"
  ],
  "цагт дууссан": [
    "finished at",
    "结束时间"
  ],
  "Дууссан": [
    "Finished",
    "已结束"
  ],
  "Улаанбаатарын цагаар": [
    "Ulaanbaatar time",
    "乌兰巴托时间"
  ],
  "Өдөр бүр нэг шинэ түүх.": [
    "A new story every day.",
    "每一天都是一个新故事。"
  ],
  "Суралцах. Бүтээх. Дурсах.": [
    "Learn. Create. Remember.",
    "学习。创造。留念。"
  ],
  "ТӨГСӨХ АНГИ": [
    "SENIOR CLASS",
    "毕业班"
  ],
  "БИДНИЙ ОРОН ЗАЙ": [
    "OUR SPACE",
    "我们的空间"
  ],
  "Нэг дор, бүх ном": [
    "Every book, in one place",
    "所有课本尽在此处"
  ],
  "12-р ангийн сурах бичиг, миний ажил": [
    "Grade 12 textbooks and my work",
    "十二年级教科书与我的作业"
  ],
  "Бидний үлдээх мөр": [
    "The marks we leave",
    "我们留下的印记"
  ],
  "Зураг, өнгө, хэзээ ч арилахгүй дурсамж": [
    "Pictures, colors and lasting memories",
    "照片、色彩与永远珍藏的回忆"
  ],
  "Дугуйлангийн хуваарь": [
    "Club timetable",
    "社团时间表"
  ],
  "Дугуйлангийн долоо хоногийн хуваарь": [
    "Weekly club timetable",
    "每周社团时间表"
  ],
  "Дугуйлангууд": [
    "Clubs",
    "社团"
  ],
  "Дугуйлан хайх": [
    "Search clubs",
    "搜索社团"
  ],
  "Дугуйлан, багш, танхим хайх…": [
    "Search club, teacher or room…",
    "搜索社团、老师或教室…"
  ],
  "Дугуйлан / секц": [
    "Club / activity",
    "社团／活动"
  ],
  "Хамрагдах анги": [
    "Grades",
    "适用年级"
  ],
  "Бүх анги": [
    "All grades",
    "所有年级"
  ],
  "Бүх өдрийг харах": [
    "View all days",
    "查看所有日期"
  ],
  "Гарагаар шүүх": [
    "Filter by day",
    "按星期筛选"
  ],
  "Шүүлтүүр цэвэрлэх": [
    "Clear filters",
    "清除筛选"
  ],
  "Нийт хуваарь": [
    "Full timetable",
    "完整时间表"
  ],
  "Нийт хуваарь харах": [
    "View full timetable",
    "查看完整时间表"
  ],
  "Эх хуваарийн тэмдэглэл": [
    "Notes from the original timetable",
    "原始时间表备注"
  ],
  "Дугуйлангийн эх хуваарь": [
    "Original club timetable",
    "社团原始时间表"
  ],
  "Эх зураг": [
    "Original image",
    "原图"
  ],
  "Өдөр сонгох": [
    "Choose day",
    "选择日期"
  ],
  "Өөр өдөр": [
    "Another day",
    "其他日期"
  ],
  "Хуваарь харах өдөр": [
    "Timetable date",
    "查看日期"
  ],
  "Миний хуваарь": [
    "My timetable",
    "我的时间表"
  ],
  "12-2 · МИНИЙ ДУГУЙЛАН": [
    "12-2 · MY CLUBS",
    "12-2 · 我的社团"
  ],
  "Миний бүртгэлийн 3 сонголт": [
    "My three registered choices",
    "我登记的三个志愿"
  ],
  "Нэрээ сонгоод өөрийн хуваарийг хараарай": [
    "Choose your name to see your timetable",
    "选择姓名，查看你的时间表"
  ],
  "Өнөөдөр, маргааш ямар дугуйлантайгаа болон хэдэн цагт эхлэхийг хараарай.": [
    "See your clubs today and tomorrow, and when they start.",
    "查看今天和明天的社团及开始时间。"
  ],
  "Өнөөдөр дугуйлангүй": [
    "No clubs today",
    "今天没有社团活动"
  ],
  "Маргааш дугуйлангүй": [
    "No clubs tomorrow",
    "明天没有社团活动"
  ],
  "Энэ өдөр дугуйлангүй": [
    "No clubs on this day",
    "这一天没有社团活动"
  ],
  "Дугуйлангийн сонголт бүртгэгдээгүй байна": [
    "No club choices registered",
    "尚未登记社团志愿"
  ],
  "Өгсөн бүртгэлийн жагсаалтад энэ нэрийн сонголт байхгүй. Нийт хуваарийг үзэх боломжтой.": [
    "No choices are listed for this name. You can view the full timetable.",
    "登记名单中没有此姓名的志愿。你仍可查看完整时间表。"
  ],
  "Цаг хараахан оруулаагүй": [
    "Time not available yet",
    "时间尚未公布"
  ],
  "Цаг тэмдэглээгүй": [
    "No time listed",
    "未列出时间"
  ],
  "Хайлтыг цэвэрлэх": [
    "Clear search",
    "清除搜索"
  ],
  "Нэр, багш эсвэл танхимыг өөрөөр хайгаарай.": [
    "Try another club name, teacher or room.",
    "请尝试其他社团名称、老师或教室。"
  ],
  "Энэ ангид зориулсан цаг эх хуваарьт тэмдэглэгдээгүй байна.": [
    "The original timetable has no times for this grade.",
    "原始时间表未列出此年级的时间。"
  ],
  "Эх зурагт байгаа цагуудыг сонгосон дугуйлантай холбоод харуулав. Сонголтуудыг 2026.09.21-ний бүртгэлээс авсан.": [
    "Times are matched to your selected clubs from the original timetable. Choices come from the 2026.09.21 registration.",
    "已将原始时间表与所选社团匹配。志愿来自 2026.09.21 的登记名单。"
  ],
  "Цомог түгжээтэй": [
    "Album locked",
    "相册已锁定"
  ],
  "Ангийн цомгийг үзэхийн тулд 4 оронтой кодоо оруулна уу.": [
    "Enter the four-digit code to open the class album.",
    "输入四位密码，打开班级相册。"
  ],
  "Ангийн цомог": [
    "Class album",
    "班级相册"
  ],
  "Дурсамжит зураг, бичлэгүүд": [
    "Photos and videos to remember",
    "值得珍藏的照片与视频"
  ],
  "Зураг нэмэх": [
    "Add photos",
    "添加照片"
  ],
  "Цомгийг түгжих": [
    "Lock album",
    "锁定相册"
  ],
  "Зураг": [
    "Photos",
    "照片"
  ],
  "Видео": [
    "Videos",
    "视频"
  ],
  "Шүүлтүүр": [
    "Filters",
    "筛选"
  ],
  "Цааш үзэх": [
    "Load more",
    "加载更多"
  ],
  "Зургийн сан": [
    "Photo library",
    "照片库"
  ],
  "Зургийн цомог": [
    "Photo album",
    "相册"
  ],
  "Зураг, видео database/photos хавтсанд хадгалагдана. Нэг файлын хэмжээнд хязгаар байхгүй.": [
    "Photos and videos are stored in database/photos. Individual files have no fixed limit.",
    "照片和视频保存在 database/photos 中。单个文件没有固定大小限制。"
  ],
  "Урьдчилан үзэх": [
    "Preview",
    "预览"
  ],
  "Зураг, бичлэг нэмэх": [
    "Add photos and videos",
    "添加照片与视频"
  ],
  "Файл сонгох": [
    "Choose files",
    "选择文件"
  ],
  "Файлуудыг энд чирэх эсвэл сонгох": [
    "Drag files here or choose them",
    "将文件拖到这里或点击选择"
  ],
  "Нэмж байна…": [
    "Adding…",
    "正在添加…"
  ],
  "Байршуулж байна…": [
    "Uploading…",
    "正在上传…"
  ],
  "Сурагчдын хавтас": [
    "Student folders",
    "学生文件夹"
  ],
  "Нэрээ сонгоод 4 оронтой нууц үгээ оруулна уу.": [
    "Choose your name and enter your four-digit password.",
    "选择姓名并输入四位密码。"
  ],
  "Нэрээр хайх": [
    "Search by name",
    "按姓名搜索"
  ],
  "Сурагчийн нэр…": [
    "Student name…",
    "学生姓名…"
  ],
  "Хувийн хавтсандаа файл нэмэх, урьдчилан үзэх, татах, устгах боломжтой.": [
    "Add, preview, download and delete files in your personal folder.",
    "在个人文件夹中添加、预览、下载或删除文件。"
  ],
  "Бүх хавтас": [
    "All folders",
    "所有文件夹"
  ],
  "Файл нэмэх": [
    "Upload files",
    "上传文件"
  ],
  "Шинэ хавтас": [
    "New folder",
    "新建文件夹"
  ],
  "Хавтасны тайлбар, дүрс": [
    "Folder description and icon",
    "文件夹说明与图标"
  ],
  "Хавтас хуваалцах": [
    "Share folder",
    "分享文件夹"
  ],
  "Хавтасны зам": [
    "Folder path",
    "文件夹路径"
  ],
  "Файлаар хайх": [
    "Search files",
    "搜索文件"
  ],
  "Файлын нэр…": [
    "File name…",
    "文件名称…"
  ],
  "Зөөх": [
    "Move",
    "移动"
  ],
  "Файл байршуулах явц": [
    "Upload progress",
    "上传进度"
  ],
  "Файл нэмэх явц": [
    "Upload progress",
    "上传进度"
  ],
  "0 сонгосон": [
    "0 selected",
    "已选择 0 项"
  ],
  "Хавтасны нэр": [
    "Folder name",
    "文件夹名称"
  ],
  "Дүрс": [
    "Icon",
    "图标"
  ],
  "Нэр солих": [
    "Rename",
    "重命名"
  ],
  "Нэр засах": [
    "Edit name",
    "编辑名称"
  ],
  "Файлын нэр": [
    "File name",
    "文件名称"
  ],
  "Нээгдсэн": [
    "Unlocked",
    "已解锁"
  ],
  "4 оронтой нууц үг": [
    "Four-digit password",
    "四位密码"
  ],
  "Хавтас нээх": [
    "Open folder",
    "打开文件夹"
  ],
  "Файл байхгүй байна.": [
    "No files yet.",
    "暂无文件。"
  ],
  "Хавтас байхгүй байна.": [
    "No folders yet.",
    "暂无文件夹。"
  ],
  "Энэ нэртэй хавтас олдсонгүй.": [
    "No folder with this name.",
    "未找到此名称的文件夹。"
  ],
  "Хуваалцсан хавтас": [
    "Shared folder",
    "共享文件夹"
  ],
  "Холбоосын эрхийн дагуу файл үзэх, татах, нэмэх боломжтой.": [
    "View, download or upload files according to this link's permissions.",
    "可根据此链接的权限查看、下载或上传文件。"
  ],
  "Холбоос хуулах": [
    "Copy link",
    "复制链接"
  ],
  "Холбоос хаах": [
    "Revoke link",
    "撤销链接"
  ],
  "Шинэ холбоос": [
    "New link",
    "新建链接"
  ],
  "Холбоос үүсгэх": [
    "Create link",
    "创建链接"
  ],
  "Холбоос шинэчлэх": [
    "Recreate link",
    "重新创建链接"
  ],
  "Хуваалцах": [
    "Share",
    "分享"
  ],
  "Файл хуваалцах": [
    "Share file",
    "分享文件"
  ],
  "Унших, татах": [
    "View and download",
    "查看与下载"
  ],
  "Файл нэмэхийг зөвшөөрөх": [
    "Allow uploads",
    "允许上传"
  ],
  "Бүрэн Office засварлагч": [
    "Full Office editor",
    "完整 Office 编辑器"
  ],
  "Файл хөрвүүлэх": [
    "Convert file",
    "转换文件"
  ],
  "Хөрвүүлэх": [
    "Convert",
    "转换"
  ],
  "Хөрвүүлэлт": [
    "Conversion",
    "文件转换"
  ],
  "Засварлах": [
    "Edit",
    "编辑"
  ],
  "Хадгалаагүй өөрчлөлт байна": [
    "Unsaved changes",
    "有未保存的更改"
  ],
  "Хадгалагдаагүй ажлаа сэргээх": [
    "Recover unsaved work",
    "恢复未保存的内容"
  ],
  "Ном": [
    "Books",
    "书籍"
  ],
  "Номын тавиур": [
    "Bookshelf",
    "书架"
  ],
  "Манай номын тавиур": [
    "Our bookshelf",
    "我们的书架"
  ],
  "12-Р АНГИ / НОМЫН САН": [
    "GRADE 12 / LIBRARY",
    "十二年级／图书馆"
  ],
  "12-Р АНГИЙН СУРАХ БИЧИГ": [
    "GRADE 12 TEXTBOOKS",
    "十二年级教科书"
  ],
  "Номоо нээгээд, бодол санаа болон бодлогынхоо шийдлийг нэг дор тэмдэглэе.": [
    "Open a book and keep your thoughts and solutions together.",
    "打开课本，将想法与解题过程记录在同一处。"
  ],
  "сурах бичиг": [
    "textbooks",
    "教科书"
  ],
  "Албан ёсны цахим эх": [
    "Official digital source",
    "官方电子资源"
  ],
  "Тэмдэглэлтэй уншигч": [
    "Reader with notes",
    "带笔记的阅读器"
  ],
  "Өнөөдрийн хичээл.": [
    "Today's lesson.",
    "今天的课程。"
  ],
  "Маргаашийн боломж.": [
    "Tomorrow's possibilities.",
    "明天的可能。"
  ],
  "Хичээл, номын нэрээр хайх…": [
    "Search subject or book title…",
    "搜索学科或课本名称…"
  ],
  "Сурах бичиг хайх": [
    "Search textbooks",
    "搜索教科书"
  ],
  "Номын төрөл": [
    "Book category",
    "课本类别"
  ],
  "Эх сайтад нээх ↗": [
    "Open original site ↗",
    "打开原网站 ↗"
  ],
  "Номыг ачаалж байна…": [
    "Loading book…",
    "正在加载课本…"
  ],
  "Номоо томруулах": [
    "Expand book",
    "放大课本"
  ],
  "Сурах бичгийн албан ёсны уншигч": [
    "Official textbook reader",
    "官方教科书阅读器"
  ],
  "Ном харагдахгүй байвал": [
    "If the book does not appear,",
    "若课本未显示，请到"
  ],
  "-д нээгээрэй.": [
    "open it there.",
    "打开。"
  ],
  "эсвэл": [
    "or",
    "或"
  ],
  "болон": [
    "and",
    "和"
  ],
  "Эдгээр нь": [
    "These are",
    "这些是"
  ],
  "-ийн 12-р ангийн цахим санд байгаа бүх 10 сурах бичиг. Номыг эх сайтын уншигчаар нээнэ.": [
    "all 10 Grade 12 textbooks in the digital library. Books open in their original reader.",
    "电子图书馆中的全部 10 本十二年级教科书。课本将通过原网站阅读器打开。"
  ],
  "МИНИЙ АЖЛЫН ДЭВТЭР": [
    "MY WORKBOOK",
    "我的练习本"
  ],
  "Хувийн ажлаа нээхийн тулд нэвтрээрэй.": [
    "Sign in to open your personal work.",
    "登录以打开个人作业。"
  ],
  "Нэвтэрсний дараа ажил тань вэбсайтад хадгалагдаж, бусад төхөөрөмжөөс нээгдэнэ.": [
    "Once signed in, your work is saved online and opens on other devices.",
    "登录后，作业将在线保存，并可从其他设备打开。"
  ],
  "Унш. Бод. Тэмдэглэ.": [
    "Read. Think. Write.",
    "阅读。思考。记录。"
  ],
  "Хуудас / сэдэв": [
    "Page / topic",
    "页码／主题"
  ],
  "Жишээ нь: 42-р хуудас, бодлого 3": [
    "For example: page 42, exercise 3",
    "例如：第 42 页，第 3 题"
  ],
  "Тэмдэглэл": [
    "Notes",
    "笔记"
  ],
  "Тэмдэглэл, бодлого, даалгавар": [
    "Notes, exercises and homework",
    "笔记、练习与作业"
  ],
  "Хичээлийн тэмдэглэл": [
    "Study notes",
    "学习笔记"
  ],
  "Өөрийн үгээр тайлбарлаарай. Бодлогын алхам, шинэ санаа, багшаас асуух зүйлсээ энд бичээрэй…": [
    "Explain it in your own words. Write your steps, ideas and questions for your teacher…",
    "用自己的话说明。记录解题步骤、新想法以及想问老师的问题…"
  ],
  "Зураг, бодолт": [
    "Drawings and solutions",
    "绘图与解答"
  ],
  "Бийр": [
    "Brush",
    "画笔"
  ],
  "Бийрийн өргөн": [
    "Brush width",
    "画笔宽度"
  ],
  "Зураасны өнгө": [
    "Stroke color",
    "线条颜色"
  ],
  "Бодлогоо зурж бичих талбар": [
    "Drawing area for your solution",
    "绘制解题过程的区域"
  ],
  "Вэбсайтад хадгалах": [
    "Save online",
    "在线保存"
  ],
  "Тэмдэглэлээ харуулах": [
    "Show notes",
    "显示笔记"
  ],
  "Хэвийн хэмжээ": [
    "Normal size",
    "正常大小"
  ],
  "Ийм нэртэй ном олдсонгүй. Өөр нэрээр хайгаарай.": [
    "No book found. Try another title.",
    "未找到课本。请尝试其他名称。"
  ],
  "Унших + ажиллах ↗": [
    "Read + work ↗",
    "阅读并完成作业 ↗"
  ],
  "ЕРӨНХИЙ БОЛОВСРОЛЫН": [
    "SCHOOL",
    "基础教育"
  ],
  "Байгалийн ухаан": [
    "Science",
    "自然科学"
  ],
  "Нийгмийн ухаан": [
    "Social sciences",
    "社会科学"
  ],
  "Хэл": [
    "Languages",
    "语言"
  ],
  "ECONTENT-ийн уншигч ачаалж байна…": [
    "Loading the ECONTENT reader…",
    "正在加载 ECONTENT 阅读器…"
  ],
  "ECONTENT · албан ёсны уншигч": [
    "ECONTENT · official reader",
    "ECONTENT · 官方阅读器"
  ],
  "ECONTENT-ийн уншигч · шаардлагатай бол эх сайтад нээгээрэй": [
    "ECONTENT reader · open the original site if needed",
    "ECONTENT 阅读器 · 如有需要，请打开原网站"
  ],
  "Шинэ ажил. Бичиж эсвэл зурж эхлэхэд вэбсайтад автоматаар хадгална.": [
    "New work. Start writing or drawing to save online automatically.",
    "新作业。开始书写或绘图后，将自动在线保存。"
  ],
  "Ажил таны хувийн хавтсанд хадгалагдсан. Өөр төхөөрөмжөөс нэр, кодоороо нэвтэрч нээнэ.": [
    "Your work is saved in your personal folder. Sign in by name and code on another device.",
    "作业已保存在个人文件夹。可在其他设备上用姓名和密码登录查看。"
  ],
  "Бидний дурсамжийн самбар": [
    "Our memory board",
    "我们的回忆墙"
  ],
  "Цомгийн 4 оронтой кодоор нээгээд, ангийнхаа дурсамжийг хамт бүтээе.": [
    "Unlock with the album's four-digit code and create class memories together.",
    "输入相册的四位密码，一起创造班级回忆。"
  ],
  "Энэ жилийн жижиг мөчүүдийг энд үлдээе.": [
    "Keep this year's little moments here.",
    "把这一年的小小瞬间留在这里。"
  ],
  "Зур. Бич. Наа. Хамтдаа дурсамж бүтээ.": [
    "Draw. Write. Add stickers. Make memories together.",
    "画画、书写、贴图。一起创造回忆。"
  ],
  "✦ Зурах · Бичих · Зураг · GIF": [
    "✦ Draw · Write · Photos · GIF",
    "✦ 绘图 · 书写 · 照片 · GIF"
  ],
  "Хадгалсан зурлага, зураг, бичвэрийг арилгахгүй. Хуудас бүр бидний дурсамж болон үлдэнэ.": [
    "Saved drawings, pictures and text cannot be erased. Every page stays as a memory.",
    "已保存的涂鸦、图片和文字无法擦除。每一页都将成为我们的回忆。"
  ],
  "Шинэ хуудас": [
    "New page",
    "新建页面"
  ],
  "Дурсамжийн самбарыг түгжих": [
    "Lock memory board",
    "锁定回忆墙"
  ],
  "Хуудасны нэр, зохиогч…": [
    "Page title or author…",
    "页面名称或作者…"
  ],
  "Ачаалсан хуудсуудаас нэр, зохиогчоор хайх": [
    "Search loaded pages by title or author",
    "按名称或作者搜索已加载的页面"
  ],
  "Хуудасны төлөв": [
    "Page status",
    "页面状态"
  ],
  "Зурж болно": [
    "Open for drawing",
    "可以绘画"
  ],
  "Дараагийн хуудсууд": [
    "More pages",
    "更多页面"
  ],
  "Бүх хуудас": [
    "All pages",
    "所有页面"
  ],
  "PNG татах": [
    "Download PNG",
    "下载 PNG"
  ],
  "GIF татах": [
    "Download GIF",
    "下载 GIF"
  ],
  "Зургийн орчныг томруулах": [
    "Expand drawing area",
    "放大绘图区域"
  ],
  "Хадгалсан дурсамж хэвээр үлдэнэ": [
    "Saved memories stay",
    "已保存的回忆将保留"
  ],
  "Зурах хэрэгслүүд": [
    "Drawing tools",
    "绘图工具"
  ],
  "Үзэг": [
    "Pen",
    "画笔"
  ],
  "Үзэг (P)": [
    "Pen (P)",
    "画笔（P）"
  ],
  "үзэг": [
    "pen",
    "画笔"
  ],
  "Тодруулагч": [
    "Highlighter",
    "荧光笔"
  ],
  "Тодруулагч (H)": [
    "Highlighter (H)",
    "荧光笔（H）"
  ],
  "тодруулагч": [
    "highlighter",
    "荧光笔"
  ],
  "Хуудсыг зөөж харах": [
    "Pan page",
    "移动画布"
  ],
  "Хуудсыг зөөж харах (V эсвэл Space)": [
    "Pan page (V or Space)",
    "移动画布（V 或空格）"
  ],
  "зөөх ·": [
    "pan ·",
    "移动 ·"
  ],
  "дарж зөөнө": [
    "hold to pan",
    "按住并移动"
  ],
  "Бичвэр": [
    "Text",
    "文字"
  ],
  "Бичвэр нэмэх": [
    "Add text",
    "添加文字"
  ],
  "Бичвэр нэмэх (T)": [
    "Add text (T)",
    "添加文字（T）"
  ],
  "Наадаг тэмдэглэл": [
    "Sticky note",
    "便签"
  ],
  "Стикер": [
    "Stickers",
    "贴纸"
  ],
  "Хөдөлгөөнт": [
    "Animated",
    "动态"
  ],
  "Үзгийн хэмжээ": [
    "Pen size",
    "画笔大小"
  ],
  "Үзгийн хэмжээ сонгох": [
    "Choose pen size",
    "选择画笔大小"
  ],
  "Нарийн": [
    "Thin",
    "细"
  ],
  "Дунд": [
    "Medium",
    "中"
  ],
  "Бүдүүн": [
    "Thick",
    "粗"
  ],
  "Нарийн · 2 px": [
    "Thin · 2 px",
    "细 · 2 像素"
  ],
  "Дунд · 5 px": [
    "Medium · 5 px",
    "中 · 5 像素"
  ],
  "Бүдүүн · 16 px": [
    "Thick · 16 px",
    "粗 · 16 像素"
  ],
  "Хуудсыг дуусгах": [
    "Finish page",
    "完成页面"
  ],
  "Дууссан хуудас": [
    "Finished page",
    "已完成页面"
  ],
  "ӨНГӨ": [
    "COLOR",
    "颜色"
  ],
  "Зургийн өнгө": [
    "Drawing color",
    "绘图颜色"
  ],
  "Өөр өнгө": [
    "Custom color",
    "自定义颜色"
  ],
  "Өөр өнгө сонгох": [
    "Choose custom color",
    "选择自定义颜色"
  ],
  "Хамтын дурсамжийн хуудас. Хуруу эсвэл үзгээр зурна.": [
    "Shared memory page. Draw with a finger or pen.",
    "共享回忆页面。用手指或画笔绘画。"
  ],
  "Бүтнээр харах": [
    "Fit to screen",
    "适应屏幕"
  ],
  "Хуудсыг бүтнээр харах (F)": [
    "Fit page (F)",
    "适应页面（F）"
  ],
  "Жижигрүүлэх": [
    "Zoom out",
    "缩小"
  ],
  "Томруулах": [
    "Zoom in",
    "放大"
  ],
  "Харах хэмжээ": [
    "Zoom level",
    "缩放比例"
  ],
  "100 хувийн хэмжээгээр харах": [
    "View at 100%",
    "以 100% 显示"
  ],
  "Хуудсуудыг шинэчлэх": [
    "Refresh pages",
    "刷新页面"
  ],
  "Хадгалсан зураас үлдэнэ. Зөвхөн хадгалаагүй шинэ зураасыг буцааж болно.": [
    "Saved strokes stay. Only unsaved new strokes can be undone.",
    "已保存的线条将保留。只能撤销尚未保存的新线条。"
  ],
  "Шинэ зураас буцаах": [
    "Undo new stroke",
    "撤销新线条"
  ],
  "Эхний хуудсаа хамт бүтээе.": [
    "Let's create our first page.",
    "一起创建第一页吧。"
  ],
  "Зурлага, зураг, бичвэр, GIF-ээр ангийнхаа дурсамжийг үлдээгээрэй.": [
    "Keep class memories with drawings, photos, text and GIFs.",
    "用涂鸦、照片、文字和 GIF 留下班级回忆。"
  ],
  "Тохирох хуудас алга байна.": [
    "No matching pages.",
    "没有匹配的页面。"
  ],
  "Хайлт эсвэл шүүлтүүрээ өөрчлөөрэй.": [
    "Try another search or filter.",
    "请更改搜索词或筛选条件。"
  ],
  "Дурсамж": [
    "Memory",
    "回忆"
  ],
  "Вэбсайтад хадгалж байна…": [
    "Saving online…",
    "正在在线保存…"
  ],
  "Холболтгүй · Ноорог энэ төхөөрөмжид хадгалагдсан": [
    "Offline · draft saved on this device",
    "离线 · 草稿已保存在此设备"
  ],
  "Шинэ зурлага байна · Автоматаар хадгална": [
    "New drawing · saving automatically",
    "有新的涂鸦 · 将自动保存"
  ],
  "Вэбсайтад хадгалагдсан · Шинэ хуудсанд үргэлжлүүлээрэй": [
    "Saved online · continue on a new page",
    "已在线保存 · 请在新页面继续"
  ],
  "Вэбсайтад хадгалагдсан · Бүх төхөөрөмжөөс нээнэ": [
    "Saved online · available on all devices",
    "已在线保存 · 可在所有设备打开"
  ],
  "Чиний аялгуу.": [
    "Your soundtrack.",
    "你的音乐。"
  ],
  "Нэрээ сонгоод дуртай дуунуудаа цуглуулаарай.": [
    "Choose your name and collect your favorite songs.",
    "选择姓名，收藏你喜欢的歌曲。"
  ],
  "Миний нэр": [
    "My name",
    "我的姓名"
  ],
  "Чиний нэр": [
    "Your name",
    "你的姓名"
  ],
  "Нэрээ сонгоорой": [
    "Choose your name",
    "选择姓名"
  ],
  "Нэрээрээ плейлист үүсгээрэй. Дуу нь энэ дэлгэц дээр тоглоно.": [
    "Create playlists under your name. Music plays on this screen.",
    "以你的姓名创建歌单。音乐将在此屏幕上播放。"
  ],
  "Шинэ плейлист": [
    "New playlist",
    "新建歌单"
  ],
  "Миний плейлистүүд": [
    "My playlists",
    "我的歌单"
  ],
  "Плейлистүүд": [
    "Playlists",
    "歌单"
  ],
  "Плейлист шүүх": [
    "Filter playlists",
    "筛选歌单"
  ],
  "Плейлистүүд шинэчлэх": [
    "Refresh playlists",
    "刷新歌单"
  ],
  "Плейлист засах": [
    "Edit playlist",
    "编辑歌单"
  ],
  "Плейлист устгах": [
    "Delete playlist",
    "删除歌单"
  ],
  "Плейлист нээгээрэй": [
    "Open a playlist",
    "打开一个歌单"
  ],
  "Дуу": [
    "Song",
    "歌曲"
  ],
  "Дуу хайж эсвэл ангийн плейлистээ сонгоорой.": [
    "Search a song or choose a class playlist.",
    "搜索歌曲或选择班级歌单。"
  ],
  "Дуу хайж эсвэл плейлистээ нээгээрэй.": [
    "Search a song or open your playlist.",
    "搜索歌曲或打开你的歌单。"
  ],
  "Өнөөдрийн аялгуу": [
    "Today's soundtrack",
    "今天的音乐"
  ],
  "Дуугаа сонгоорой": [
    "Choose a song",
    "选择歌曲"
  ],
  "Тоглуулах": [
    "Play",
    "播放"
  ],
  "Түр зогсоох": [
    "Pause",
    "暂停"
  ],
  "Өмнөх дуу": [
    "Previous song",
    "上一首"
  ],
  "Дараагийн дуу": [
    "Next song",
    "下一首"
  ],
  "Дууны явц": [
    "Song progress",
    "歌曲进度"
  ],
  "Дууны чанга сул": [
    "Volume",
    "音量"
  ],
  "Дууны хэмжээ": [
    "Volume",
    "音量"
  ],
  "Дуугаа олоорой": [
    "Find your song",
    "寻找歌曲"
  ],
  "Дуу, дуучны нэр": [
    "Song or artist",
    "歌曲或歌手"
  ],
  "Дуу, дуучны нэр…": [
    "Song or artist…",
    "歌曲或歌手…"
  ],
  "Сонсох": [
    "Listen",
    "收听"
  ],
  "Дууг сонсох": [
    "Listen to song",
    "收听歌曲"
  ],
  "Дуу нэмэх": [
    "Add song",
    "添加歌曲"
  ],
  "Хасах": [
    "Remove",
    "移除"
  ],
  "Жагсаалтаас хасах": [
    "Remove from playlist",
    "从歌单移除"
  ],
  "Дууг дээш зөөх": [
    "Move song up",
    "将歌曲上移"
  ],
  "Дууг доош зөөх": [
    "Move song down",
    "将歌曲下移"
  ],
  "← Өмнөх": [
    "← Previous",
    "← 上一页"
  ],
  "Дараагийн 20 →": [
    "Next 20 →",
    "接下来的 20 首 →"
  ],
  "Дараагийн дуунууд энд харагдана.": [
    "Upcoming songs appear here.",
    "下一首歌曲将显示在这里。"
  ],
  "Тоглуулж эхлэхэд дараагийн дуунууд харагдана.": [
    "Upcoming songs appear when playback starts.",
    "开始播放后将显示接下来的歌曲。"
  ],
  "Хогийн сав": [
    "Trash",
    "回收站"
  ],
  "Хогийн сав хоосон байна.": [
    "Trash is empty.",
    "回收站为空。"
  ],
  "Жишээ нь: Оройн аялгуу": [
    "For example: Evening tunes",
    "例如：夜晚旋律"
  ],
  "Энэ плейлистийн мэдрэмж…": [
    "The mood of this playlist…",
    "这个歌单的氛围…"
  ],
  "Чиний плейлист хараахан алга. «Шинэ плейлист» дарж эхлээрэй.": [
    "No playlists yet. Choose New playlist to start.",
    "暂无歌单。点击“新建歌单”开始。"
  ],
  "Өөрийн плейлистүүдийг харахын тулд нэрээ сонгоорой.": [
    "Choose your name to see your playlists.",
    "选择姓名以查看你的歌单。"
  ],
  "Плейлист сайт дээр хадгалагдана. Дуу нэмэх, хасах, дарааллыг өөрчилж болно.": [
    "Playlists are saved on the website. Add, remove or reorder songs.",
    "歌单保存在网站上。可添加、移除歌曲或调整顺序。"
  ],
  "Нэрээ сонгоод өөрийн плейлистээ үүсгээрэй. Бүгдийн плейлист энэ дэлгэц дээр тоглоно.": [
    "Choose your name and make your playlist. Everyone's playlists play on this screen.",
    "选择姓名并创建歌单。所有人的歌单都可在此屏幕播放。"
  ],
  "Дуунууд Spotify-оос дарааллаар тоглоно. Ангийн плейлистүүд сайт дээр хадгалагдана.": [
    "Songs play in order from Spotify. Class playlists are saved on this website.",
    "歌曲由 Spotify 按顺序播放。班级歌单保存在本网站。"
  ],
  "Дууны чангыг төхөөрөмжийн товчоор тааруулна. Дуунууд Spotify-ийн дарааллаар тоглоно.": [
    "Adjust volume on your device. Songs play in Spotify order.",
    "用设备按钮调节音量。歌曲按 Spotify 顺序播放。"
  ],
  "Spotify тоглуулагч нээж байна…": [
    "Opening Spotify player…",
    "正在打开 Spotify 播放器…"
  ],
  "Spotify · бэлэн": [
    "Spotify · ready",
    "Spotify · 已就绪"
  ],
  "Spotify · тоглож байна": [
    "Spotify · playing",
    "Spotify · 正在播放"
  ],
  "Тоглуулагч нээж байна…": [
    "Opening player…",
    "正在打开播放器…"
  ],
  "Spotify-г холбоорой": [
    "Connect Spotify",
    "连接 Spotify"
  ],
  "Spotify холбох": [
    "Connect Spotify",
    "连接 Spotify"
  ],
  "Spotify дараалал": [
    "Spotify queue",
    "Spotify 播放队列"
  ],
  "Spotify-ийн дараагийн дуу ирэхэд энд харагдана.": [
    "The next Spotify song will appear here.",
    "下一首 Spotify 歌曲将显示在这里。"
  ],
  "Плейлистээ тоглуулахад дараагийн дуунууд энд харагдана.": [
    "Play your playlist to see upcoming songs here.",
    "播放歌单后，接下来的歌曲将显示在这里。"
  ],
  "Дуу хайж байна…": [
    "Searching songs…",
    "正在搜索歌曲…"
  ],
  "Илэрц олдсонгүй. Өөр нэрээр хайгаарай.": [
    "No results. Try another name.",
    "没有结果。请尝试其他名称。"
  ],
  "Холбогдоод дуугаа сонгоорой.": [
    "Connect and choose your music.",
    "连接后选择歌曲。"
  ],
  "Тоглуулагчийг дахин нээх": [
    "Reopen player",
    "重新打开播放器"
  ],
  "Энэ том дэлгэц дээр нэг Spotify Premium бүртгэлээр нэг удаа холбоорой.": [
    "Connect one Spotify Premium account on this display once.",
    "在此大屏幕上连接一个 Spotify Premium 账号即可。"
  ],
  "Шууд сонсож эсвэл өөрийн нэр дээрх ангийн плейлистэд нэмээрэй.": [
    "Listen now or add to your class playlist.",
    "立即收听或添加到你的班级歌单。"
  ],
  "Чиний ээлж.": [
    "Your turn.",
    "轮到你了。"
  ],
  "Дөрвөн зураг. Нэг дурсамж. Манай төгсөлтийн жижигхэн студи.": [
    "Four photos. One memory. Our little graduation studio.",
    "四张照片，一段回忆。我们的毕业小影棚。"
  ],
  "Камер зөвхөн асаасан үед ажиллана. Дуу бичихгүй. Энэ хэсгээс гарахад камер унтарна.": [
    "The camera works only when you turn it on. No audio is recorded. Leaving this section turns it off.",
    "相机仅在你打开时工作，不录音。离开此栏目后相机会关闭。"
  ],
  "Дөрвөн зураг": [
    "Four photos",
    "四张照片"
  ],
  "4 амьд зураг · GIF": [
    "4 live photos · GIF",
    "4 张动态照片 · GIF"
  ],
  "4 амьд зураг · GIF татах": [
    "4 live photos · download GIF",
    "4 张动态照片 · 下载 GIF"
  ],
  "Камер асаах": [
    "Start camera",
    "打开相机"
  ],
  "Камер унтраах": [
    "Stop camera",
    "关闭相机"
  ],
  "Камер унтраалттай": [
    "Camera off",
    "相机已关闭"
  ],
  "Камераа асаагаад найзуудаа дуудаарай.": [
    "Start the camera and gather your friends.",
    "打开相机，叫上朋友们。"
  ],
  "Толин дүрс": [
    "Mirror image",
    "镜像"
  ],
  "Дахин авах": [
    "Retake",
    "重拍"
  ],
  "Камер ажиллахгүй байна уу? Зураг сонгох": [
    "Camera unavailable? Choose photos",
    "相机不可用？选择照片"
  ],
  "Төхөөрөмж дээрх зургаа ч мөн жаазанд оруулж болно.": [
    "You can also frame photos from your device.",
    "也可将设备中的照片放入相框。"
  ],
  "01 / ПОЗОО АВААРАЙ": [
    "01 / STRIKE A POSE",
    "01／摆个姿势"
  ],
  "02 / ӨӨРИЙНХӨӨ БОЛГООРОЙ": [
    "02 / MAKE IT YOURS",
    "02／设计你的风格"
  ],
  "Жааз": [
    "Frames",
    "相框"
  ],
  "Чиний илгээсэн жааз": [
    "Your uploaded frame",
    "你上传的相框"
  ],
  "Цэвэрхэн цагаан": [
    "Clean white",
    "简约白色"
  ],
  "Хар, мөнгөлөг": [
    "Black and silver",
    "黑色与银色"
  ],
  "Зөөлөн ногоон": [
    "Soft green",
    "柔和绿色"
  ],
  "Өнгө, гэрэл": [
    "Color and light",
    "色彩与光线"
  ],
  "Өнгөний фильтрүүд": [
    "Color filters",
    "色彩滤镜"
  ],
  "Нүүрний эффектүүд": [
    "Face effects",
    "面部特效"
  ],
  "Нүүрийг таньж байрлана. Авсан дөрвөн зураг болон GIF-д хэрэглэнэ. 4 хүртэлх хүнийг танина.": [
    "Effects follow your face in all four photos and the GIF. Supports up to four people.",
    "特效会跟随面部，应用于四张照片和 GIF。最多识别四个人。"
  ],
  "Зургаа авсны дараа дэвсгэрийг цагаан болгох": [
    "Make the background white after capture",
    "拍摄后将背景变为白色"
  ],
  "Эхлээд дөрвөн зургаа аваарай. PNG болон GIF-д ижил үйлчилнэ.": [
    "Take your four photos first. Applies to both PNG and GIF.",
    "请先拍摄四张照片。效果同时应用于 PNG 和 GIF。"
  ],
  "Стикерийн сан": [
    "Sticker library",
    "贴纸库"
  ],
  "Стикерээ чирж байрлуулаад хэмжээ, өнгө, эргэлтийг нь өөрчлөөрэй.": [
    "Drag stickers and adjust their size, color and rotation.",
    "拖动贴纸，调整大小、颜色与旋转角度。"
  ],
  "Зүрх, star, besties…": [
    "Hearts, stars, besties…",
    "爱心、星星、好友…"
  ],
  "Нэмсэн стикерүүд": [
    "Added stickers",
    "已添加的贴纸"
  ],
  "Стикер арилгах": [
    "Remove sticker",
    "移除贴纸"
  ],
  "Сонгосон стикерийн хэмжээ": [
    "Selected sticker size",
    "所选贴纸大小"
  ],
  "Сонгосон стикерийн эргэлт": [
    "Selected sticker rotation",
    "所选贴纸旋转角度"
  ],
  "Сонгосон стикерийн өнгө": [
    "Selected sticker color",
    "所选贴纸颜色"
  ],
  "Дөрвөн зурагтай жааз. Стикерийг энд чирж байрлуулна.": [
    "Four-photo frame. Drag stickers into position here.",
    "四张照片的相框。可在这里拖动贴纸。"
  ],
  "Дурсамжийн нэр": [
    "Memory title",
    "回忆名称"
  ],
  "Дурсамждаа нэр өгөөрэй": [
    "Name your memory",
    "为回忆起个名字"
  ],
  "Цомогт хадгалах + QR": [
    "Save to album + QR",
    "保存到相册并生成二维码"
  ],
  "Цомгийн кодоор хадгална. QR холбоостой хүн зөвхөн энэ зургийг татна.": [
    "Save using the album code. The QR link downloads only this capture.",
    "使用相册密码保存。二维码链接只能下载这次拍摄的照片。"
  ],
  "Дурсамжаа аваад яваарай.": [
    "Take your memory with you.",
    "带走你的回忆。"
  ],
  "Зураг татах QR код": [
    "Photo download QR code",
    "照片下载二维码"
  ],
  "Зураг татах хуудас нээх ↗": [
    "Open download page ↗",
    "打开下载页面 ↗"
  ],
  "Шинэ QR үүсгэх": [
    "Create new QR",
    "生成新二维码"
  ],
  "Хадгалсан photobooth зургууд": [
    "Saved Photobooth captures",
    "已保存的拍照亭照片"
  ],
  "Хадгалсан зурагнууд": [
    "Saved photos",
    "已保存的照片"
  ],
  "Бидний зурагнууд": [
    "Our photos",
    "我们的照片"
  ],
  "Амьд зураг татах": [
    "Download live photo",
    "下载动态照片"
  ],
  "Татах / QR": [
    "Download / QR",
    "下载／二维码"
  ],
  "Анхны дурсамжаа үлдээгээрэй.": [
    "Make your first memory.",
    "留下第一段回忆吧。"
  ],
  "Стикер олдсонгүй.": [
    "No stickers found.",
    "未找到贴纸。"
  ],
  "48 стикер хүртэл нэмж болно.": [
    "You can add up to 48 stickers.",
    "最多可添加 48 张贴纸。"
  ],
  "Холбоос хууллаа.": [
    "Link copied.",
    "链接已复制。"
  ],
  "Холбоосыг сонгоод хуулна уу.": [
    "Select and copy the link.",
    "请选择并复制链接。"
  ],
  "QR бэлдэж чадсангүй. Холбоосыг хуулж болно.": [
    "QR could not be created. You can copy the link.",
    "无法生成二维码。可以复制链接。"
  ],
  "Холбоос бэлэн. QR хэрэгсэл ачаалагдаагүй байна.": [
    "Link ready. The QR tool did not load.",
    "链接已就绪。二维码工具尚未加载。"
  ],
  "Холбоос хаалттай. Өмнөх QR кодоор татах боломжгүй.": [
    "Link revoked. The previous QR no longer works.",
    "链接已撤销。旧二维码已无法下载。"
  ],
  "Холбоос хаалаа. Өмнөх QR ажиллахгүй.": [
    "Link revoked. The previous QR no longer works.",
    "链接已撤销。旧二维码已失效。"
  ],
  "Шинэ QR бэлэн. Өмнөх холбоос ажиллахгүй.": [
    "New QR ready. The previous link no longer works.",
    "新二维码已生成。旧链接已失效。"
  ],
  "Энэ зургийн холбоос хаалттай. Шинэ QR үүсгэж болно.": [
    "This photo's link is revoked. You can create a new QR.",
    "此照片的链接已撤销。可以生成新二维码。"
  ],
  "Зургийн хуудас": [
    "Photo strip",
    "照片条"
  ],
  "Live зураг": [
    "Live photo",
    "动态照片"
  ],
  "Хөдөлгөөнт Photobooth зураг": [
    "Animated Photobooth capture",
    "动态拍照亭照片"
  ],
  "Зургаа утсандаа хадгалаарай.": [
    "Save the photo to your phone.",
    "将照片保存到手机。"
  ],
  "PNG · Бүтэн хэмжээтэй зураг": [
    "PNG · full-size photo",
    "PNG · 完整尺寸照片"
  ],
  "Хөдөлгөөнт дурсамж": [
    "Animated memory",
    "动态回忆"
  ],
  "Энэ холбоос зөвхөн энэ Photobooth зургийг нээнэ.": [
    "This link opens only this Photobooth capture.",
    "此链接只能打开这次拍摄的照片。"
  ],
  "Холбоос нээгдэхгүй байна": [
    "Link unavailable",
    "链接无法打开"
  ],
  "Зураг авсан хүнээс шинэ QR холбоос аваарай.": [
    "Ask the person who took the photo for a new QR link.",
    "请向拍摄者索取新的二维码链接。"
  ],
  "Бодлоо цэгцэл. Асуултаа асуу. Яриагаа үргэлжлүүл.": [
    "Organize your thoughts. Ask a question. Keep the conversation going.",
    "整理思路。提出问题。继续交流。"
  ],
  "Нэрээ сонгоод хавтасны кодоороо нэвтрээрэй. Яриа зөвхөн чамд харагдана.": [
    "Choose your name and sign in with your folder code. Your conversations are private.",
    "选择姓名并用文件夹密码登录。对话仅你可见。"
  ],
  "Миний ярианууд": [
    "My conversations",
    "我的对话"
  ],
  "Хадгалсан ярианууд": [
    "Saved conversations",
    "已保存的对话"
  ],
  "Яриагаа хадгалахын тулд нэвтрээрэй.": [
    "Sign in to save your conversations.",
    "登录以保存对话。"
  ],
  "Шинэ яриа нээгээд асуултаа бичээрэй.": [
    "Start a new conversation and write your question.",
    "新建对话并写下问题。"
  ],
  "Хавтасны кодоо мэддэг хүн энэ нэрийн яриаг нээж чадна. Кодоо бусдад бүү дамжуулаарай.": [
    "Anyone with your folder code can open this name's conversations. Keep your code private.",
    "知道文件夹密码的人可查看此姓名的对话。请勿与他人分享密码。"
  ],
  "Чиний дараагийн санаа эндээс.": [
    "Your next idea starts here.",
    "你的下一个想法从这里开始。"
  ],
  "Энэ яриаг устгах": [
    "Delete this conversation",
    "删除此对话"
  ],
  "Сайн уу. Юу ярилцах вэ?": [
    "Hi. What shall we talk about?",
    "你好。想聊些什么？"
  ],
  "Хичээлийн бодлого, шинэ санаа, эсвэл зүгээр л өнөөдрийн тухай.": [
    "Schoolwork, a new idea, or just your day.",
    "作业、新想法，或只是聊聊今天。"
  ],
  "Хичээлээ ойлгох": [
    "Understand a lesson",
    "理解课程"
  ],
  "Өдрөө төлөвлөх": [
    "Plan your day",
    "安排一天"
  ],
  "English practice": [
    "English practice",
    "英语练习"
  ],
  "IwnlX AI хариулж байна…": [
    "IwnlX AI is replying…",
    "IwnlX AI 正在回复…"
  ],
  "AI-д зурвас бичих": [
    "Write a message to AI",
    "给 AI 写消息"
  ],
  "Асуулт эсвэл бодлоо бичээрэй…": [
    "Write a question or thought…",
    "写下问题或想法…"
  ],
  "Зурвасаа бичээд, илгээхийн өмнө нэрээ сонгоорой.": [
    "Write your message and choose your name before sending.",
    "写下消息，并在发送前选择姓名。"
  ],
  "Илгээх": [
    "Send",
    "发送"
  ],
  "Дэлгэрэнгүй хариулт": [
    "Detailed answer",
    "详细回答"
  ],
  "Яриа сайт дээр хадгалагдана. Токен хэмнэхийн тулд сүүлийн 8,000 тэмдэгт хүртэлх яриаг AI-д илгээнэ.": [
    "Conversations are saved on the website. Up to the last 8,000 characters are sent to AI to save tokens.",
    "对话保存在网站上。为节省令牌，最多向 AI 发送最近的 8,000 个字符。"
  ],
  "Enter · илгээх / Shift + Enter · шинэ мөр": [
    "Enter · send / Shift + Enter · new line",
    "Enter · 发送／Shift + Enter · 换行"
  ],
  "Яриа, мэдээлэл ба хэрэглээ": [
    "Conversations, data and usage",
    "对话、数据与用量"
  ],
  "Яриануудыг шинэчлэх": [
    "Refresh conversations",
    "刷新对话"
  ],
  "Ярианы нэр": [
    "Conversation title",
    "对话名称"
  ],
  "Устгасан ярианууд": [
    "Deleted conversations",
    "已删除的对话"
  ],
  "Хүссэн яриагаа сэргээж үргэлжлүүлээрэй.": [
    "Restore a conversation and continue.",
    "恢复需要的对话并继续交流。"
  ],
  "Устгасан яриа байхгүй байна.": [
    "No deleted conversations.",
    "没有已删除的对话。"
  ],
  "Бүх яриа сэргээгдлээ.": [
    "All conversations restored.",
    "所有对话已恢复。"
  ],
  "Яриа сэргээгдлээ.": [
    "Conversation restored.",
    "对话已恢复。"
  ],
  "AI хариултыг хуулах": [
    "Copy AI answer",
    "复制 AI 回答"
  ],
  "Хуулж чадсангүй. Хариултын текстээ сонгоод хуулж болно.": [
    "Could not copy. Select the answer text and copy it.",
    "复制失败。可以选中回答文字后复制。"
  ],
  "Илгээхийн тулд хавтасны 4 оронтой кодоо оруулна уу.": [
    "Enter your four-digit folder code to send.",
    "请输入文件夹的四位密码以发送消息。"
  ],
  "Хавтасны 4 оронтой нууц кодоо оруулна уу.": [
    "Enter your four-digit folder password.",
    "请输入文件夹的四位密码。"
  ],
  "Нууц код": [
    "Passcode",
    "密码"
  ],
  "Нууц үг": [
    "Password",
    "密码"
  ],
  "Нууц үг солих": [
    "Change password",
    "修改密码"
  ],
  "Одоогийн нууц үг": [
    "Current password",
    "当前密码"
  ],
  "Шинэ нууц үг": [
    "New password",
    "新密码"
  ],
  "Шинэ нууц үг давтах": [
    "Repeat new password",
    "再次输入新密码"
  ],
  "Нууц үг давтах": [
    "Repeat password",
    "再次输入密码"
  ],
  "Админ нэвтрэх": [
    "Administrator sign in",
    "管理员登录"
  ],
  "Админ нууц үг үүсгэх": [
    "Create administrator password",
    "创建管理员密码"
  ],
  "Үүсгэх": [
    "Create",
    "创建"
  ],
  "Тохиргооны код": [
    "Setup code",
    "设置码"
  ],
  "жишээ нь K7Q2MX9A": [
    "for example K7Q2MX9A",
    "例如 K7Q2MX9A"
  ],
  "Сайтыг тохируулаагүй байна": [
    "Site setup is incomplete",
    "网站尚未完成设置"
  ],
  "Удирдлага руу очих": [
    "Open administration",
    "打开管理页面"
  ],
  "Зураг нэмэхийн өмнө сайтын эзэн «Удирдлага» хэсэгт админ нууц үгээ үүсгэх хэрэгтэй.": [
    "The site owner must create an administrator password before photos can be uploaded.",
    "上传照片前，网站所有者须先在管理页面创建管理员密码。"
  ],
  "Зураг нэмэх, хуваарь засахын тулд нууц үгээ оруулна уу.": [
    "Enter your password to upload photos or edit the timetable.",
    "输入密码以上传照片或编辑课程表。"
  ],
  "Амжилттай нэвтэрлээ": [
    "Signed in successfully",
    "登录成功"
  ],
  "Нууц үг үүслээ. Тавтай морил!": [
    "Password created. Welcome!",
    "密码已创建。欢迎！"
  ],
  "Нууц үг буруу байна": [
    "Incorrect password",
    "密码错误"
  ],
  "Код буруу байна": [
    "Incorrect code",
    "密码错误"
  ],
  "4 оронтой кодоо бүтнээр оруулна уу.": [
    "Enter all four digits.",
    "请输入完整的四位密码。"
  ],
  "Цомгийн код": [
    "Album code",
    "相册密码"
  ],
  "Шинэ код": [
    "New code",
    "新密码"
  ],
  "Тохиргоо хадгалах": [
    "Save settings",
    "保存设置"
  ],
  "Нөөц": [
    "Backups",
    "备份"
  ],
  "Багшийн тохиргоо": [
    "Teacher settings",
    "教师设置"
  ],
  "Хичээлийн хуваарь, зургийн сан, тохиргоо": [
    "Timetable, media library and settings",
    "课程表、照片库与设置"
  ],
  "Нүүр хуудсанд харагдана.": [
    "Shown on the home page.",
    "显示在首页。"
  ],
  "Нүүр хуудсанд «Сургуулийн эх хуваарь (PDF)» холбоос болж харагдана.": [
    "Appears on the home page as the original school timetable PDF link.",
    "将在首页显示为“学校原始课程表（PDF）”链接。"
  ],
  "Сольсны дараа бусад бүх төхөөрөмж системээс гарна.": [
    "Changing this signs out all other devices.",
    "修改后，其他设备将全部退出登录。"
  ],
  "Холболт": [
    "Connection",
    "连接"
  ],
  "Холболт салгах": [
    "Disconnect",
    "断开连接"
  ],
  "Холболт хүлээж байна": [
    "Waiting for connection",
    "等待连接"
  ],
  "Холболтыг шалгаж байна": [
    "Checking connection",
    "正在检查连接"
  ],
  "Сайт руу": [
    "Open site",
    "打开网站"
  ],
  "Сайт руу буцах": [
    "Back to site",
    "返回网站"
  ],
  "Нэг сурагч / өдөр": [
    "Per student / day",
    "每名学生／每天"
  ],
  "Нийт хүсэлт / өдөр": [
    "Total requests / day",
    "总请求数／每天"
  ],
  "Ердийн хариултын токен": [
    "Standard answer tokens",
    "普通回答令牌数"
  ],
  "Хадгалсан Egune түлхүүрийг салгах": [
    "Remove saved Egune key",
    "移除已保存的 Egune 密钥"
  ],
  "Хадгалсан түлхүүрийг салгах": [
    "Remove saved key",
    "移除已保存的密钥"
  ],
  "Хоосон орхивол одоогийн түлхүүр хэвээр": [
    "Leave blank to keep the existing key",
    "留空以保留现有密钥"
  ],
  "Бүрэн Office засварлагчийг идэвхжүүлэх": [
    "Enable full Office editor",
    "启用完整 Office 编辑器"
  ],
  "Энэ сайтын HTTPS хаяг": [
    "This website's HTTPS URL",
    "本网站的 HTTPS 地址"
  ],
  "Серверийн дотоод хаяг": [
    "Internal server URL",
    "服务器内部地址"
  ],
  "Сайт дэд хавтсанд байрласан бол замыг хамт оруулна.": [
    "Include the path if the website is in a subfolder.",
    "如果网站位于子文件夹中，请包含路径。"
  ],
  "Серверийн JWT_SECRET-тэй ижил, 32-с дээш тэмдэгт.": [
    "Match the server's JWT_SECRET, with more than 32 characters.",
    "须与服务器的 JWT_SECRET 一致，且超过 32 个字符。"
  ],
  "Түлхүүр хөтөч рүү буцаахгүй. ai-settings.php файлыг index.php-ийн хажууд байрлуулна. C122_EGUNE_API_KEY серверийн тохиргоо байвал түүнийг ашиглана.": [
    "Keys are never returned to the browser. Put ai-settings.php beside index.php. The C122_EGUNE_API_KEY server setting takes precedence.",
    "密钥不会返回浏览器。请将 ai-settings.php 放在 index.php 旁边。若服务器设置了 C122_EGUNE_API_KEY，将优先使用该设置。"
  ],
  "Том дэлгэцийн камер": [
    "Display camera",
    "大屏幕摄像头"
  ],
  "Том дэлгэцийн камер, микрофоны тохиргоо": [
    "Display camera and microphone settings",
    "大屏幕摄像头与麦克风设置"
  ],
  "Шууд камер": [
    "Live camera",
    "实时摄像头"
  ],
  "Үзэж эхлэх": [
    "Start viewing",
    "开始观看"
  ],
  "Үзэхээ зогсоох": [
    "Stop viewing",
    "停止观看"
  ],
  "Үзэж буй багш": [
    "Teachers watching",
    "正在观看的教师"
  ],
  "Камерын мэдээлэл": [
    "Camera information",
    "摄像头信息"
  ],
  "Эхэлсэн цаг": [
    "Started at",
    "开始时间"
  ],
  "Сүүлийн холбоо": [
    "Last contact",
    "上次连接"
  ],
  "Бүртгэлээс устгах": [
    "Unregister",
    "取消登记"
  ],
  "Төхөөрөмж бүртгэх / солих": [
    "Register / replace device",
    "登记／更换设备"
  ],
  "Багшийн шууд хяналт руу очих": [
    "Open teacher live view",
    "打开教师实时画面"
  ],
  "Камерын мэдээлэл ачаалсны дараа үзэж эхлээрэй.": [
    "Start viewing after the camera information loads.",
    "请在摄像头信息加载完成后开始观看。"
  ],
  "Камерын холболтыг шалгаж байна.": [
    "Checking camera connection.",
    "正在检查摄像头连接。"
  ],
  "БҮРТГЭЛТЭЙ ТӨХӨӨРӨМЖ / 1 ДЭЛГЭЦ": [
    "REGISTERED DEVICE / 1 DISPLAY",
    "已登记设备／1 个屏幕"
  ],
  "12-2 / ШУУД ХОЛБОЛТ": [
    "12-2 / LIVE CONNECTION",
    "12-2／实时连接"
  ],
  "Зөвхөн шууд дүрс. Бичлэг болон дууг сайт дээр хадгалахгүй. «Үзэхээ зогсоох» нь зөвхөн таны үзэж буй холболтыг хаана.": [
    "Live video only. Video and audio are not saved on the website. Stop viewing closes only your viewing connection.",
    "仅提供实时画面。网站不保存视频或音频。“停止观看”只会关闭你的观看连接。"
  ],
  "Төхөөрөмж бүртгэх болон камер ашиглахын тулд Chrome-д JavaScript-ийг зөвшөөрнө үү.": [
    "Allow JavaScript in Chrome to register a device and use the camera.",
    "请在 Chrome 中允许 JavaScript，以登记设备并使用摄像头。"
  ],
  "Бүтэн дэлгэц": [
    "Fullscreen",
    "全屏"
  ],
  "Харанхуй горимд шилжих": [
    "Switch to dark mode",
    "切换深色模式"
  ],
  "Цайвар горимд шилжих": [
    "Switch to light mode",
    "切换浅色模式"
  ],
  "Цагаан горимд шилжих": [
    "Switch to light mode",
    "切换浅色模式"
  ],
  "Харанхуй": [
    "Dark",
    "深色"
  ],
  "Цайвар": [
    "Light",
    "浅色"
  ],
  "Сүлжээний алдаа. Интернэт холболтоо шалгана уу.": [
    "Network error. Check your internet connection.",
    "网络错误。请检查互联网连接。"
  ],
  "Серверийн хариу удаж байна. Дахин оролдоно уу.": [
    "The server is taking too long. Please try again.",
    "服务器响应时间过长。请重试。"
  ],
  "Хадгалж чадсангүй": [
    "Could not save",
    "保存失败"
  ],
  "Хадгалж чадсангүй.": [
    "Could not save.",
    "保存失败。"
  ],
  "Серверт алдаа гарлаа": [
    "Server error",
    "服务器错误"
  ],
  "Файл олдсонгүй": [
    "File not found",
    "未找到文件"
  ],
  "Эхлээд нэвтэрнэ үү": [
    "Sign in first",
    "请先登录"
  ],
  "Хүсэлт хүчингүй байна. Хуудсаа дахин ачаална уу.": [
    "Invalid request. Reload the page.",
    "请求无效。请重新加载页面。"
  ],
  "Хавтасны эрх дууссан байна. Нууц үгээ дахин оруулна уу.": [
    "Folder access has expired. Enter your password again.",
    "文件夹访问权限已过期。请重新输入密码。"
  ],
  "Хадгалах багтаамж хүрэлцэхгүй байна": [
    "Not enough storage",
    "存储空间不足"
  ],
  "Хадгаллаа": [
    "Saved",
    "已保存"
  ],
  "Хадгалагдсан": [
    "Saved",
    "已保存"
  ],
  "Хадгалж байна…": [
    "Saving…",
    "正在保存…"
  ],
  "Хадгалж байна...": [
    "Saving…",
    "正在保存…"
  ],
  "Цэс": [
    "Menu",
    "菜单"
  ],
  "Цэс нээх": [
    "Open menu",
    "打开菜单"
  ],
  "Цэс хаах": [
    "Close menu",
    "关闭菜单"
  ],
  "Ангийн хэрэгслүүд": [
    "Class tools",
    "班级工具"
  ],
  "Дэлгэрэнгүй": [
    "Details",
    "详情"
  ],
  "7 хоног": [
    "Week",
    "一周"
  ],
  "Бүх өдөр": [
    "All days",
    "所有日期"
  ],
  "Завсарлага": [
    "Break",
    "课间休息"
  ],
  "Амралтын өдөр — хичээлгүй": [
    "Day off — no classes",
    "休息日，没有课程"
  ],
  "Хуваарь оруулаагүй": [
    "No timetable added",
    "尚未添加课程表"
  ],
  "Өнөөдөр хичээлгүй": [
    "No classes today",
    "今天没有课程"
  ],
  "Одоо орж байна": [
    "Class in progress",
    "正在上课"
  ],
  "Амжилт хүсье!": [
    "Good luck!",
    "祝你顺利！"
  ],
  "Нийт": [
    "Total",
    "总计"
  ],
  "Даасан:": [
    "Homeroom teacher:",
    "班主任："
  ],
  "Нийтлэг:": [
    "Shared:",
    "公共课程："
  ],
  "Бүлэг": [
    "Group",
    "组别"
  ],
  "Бүлэг нэмэх": [
    "Add group",
    "添加组别"
  ],
  "Гараг": [
    "Day",
    "星期"
  ],
  "Сурагч:": [
    "Students:",
    "学生人数："
  ],
  "Багш заагаагүй": [
    "Teacher not listed",
    "未列出老师"
  ],
  "Танхим заагаагүй": [
    "Room not listed",
    "未列出教室"
  ],
  "Анги тодорхойгүй": [
    "Grade not specified",
    "未说明年级"
  ],
  "Ангиар шүүх": [
    "Filter by grade",
    "按年级筛选"
  ],
  "Сонгосон дугуйлангүй": [
    "No selected clubs",
    "没有所选社团"
  ],
  "Цаг хараахан оруулаагүй. Энэ дугуйлангийн цаг эх зурагт байхгүй.": [
    "Times are not available yet. This club has no times in the original image.",
    "时间尚未公布。原图未列出此社团的时间。"
  ],
  "Анги нь эх зурагт заагаагүй дугуйланг мөн харуулав.": [
    "Also showing clubs whose grade is not listed in the original image.",
    "同时显示原图中未说明年级的社团。"
  ],
  "Байрлуулах": [
    "Place",
    "放置"
  ],
  "Бэлэн": [
    "Ready",
    "已就绪"
  ],
  "Болсон": [
    "Done",
    "完成"
  ],
  "Арилгах": [
    "Remove",
    "移除"
  ],
  "Видео алга": [
    "No videos",
    "暂无视频"
  ],
  "Зураг алга": [
    "No photos",
    "暂无照片"
  ],
  "Одоогоор зураг алга": [
    "No photos yet",
    "暂无照片"
  ],
  "Ангийнхаа анхны дурсамжийг нэмээрэй.": [
    "Add your class's first memory.",
    "添加班级的第一段回忆吧。"
  ],
  "Зураг, видеогоо энд тавина уу": [
    "Drop your photos and videos here",
    "将照片与视频拖到这里"
  ],
  "Серверийн сул зай": [
    "Server free space",
    "服务器剩余空间"
  ],
  "Ашигласан": [
    "Used",
    "已使用"
  ],
  "Нийт багтаамж (ГБ)": [
    "Storage capacity (GB)",
    "存储容量（GB）"
  ],
  "КБ": [
    "KB",
    "KB"
  ],
  "МБ": [
    "MB",
    "MB"
  ],
  "ГБ": [
    "GB",
    "GB"
  ],
  "ТБ": [
    "TB",
    "TB"
  ],
  "Багтаамж хадгалагдлаа": [
    "Storage settings saved",
    "存储设置已保存"
  ],
  "Бүгдийг устгах": [
    "Delete all",
    "全部删除"
  ],
  "Бүгдийг үүсгэх": [
    "Generate all",
    "全部生成"
  ],
  "Нөөц алга байна.": [
    "No backups yet.",
    "暂无备份。"
  ],
  "Нөөцөөс сэргээлээ": [
    "Restored from backup",
    "已从备份恢复"
  ],
  "Одоогийн хуваарь мөн нөөцлөгдөнө.": [
    "The current timetable will also be backed up.",
    "当前课程表也将被备份。"
  ],
  "Бүх хичээл устна. Устгахаас өмнө нөөц хадгалагдах тул «Нөөц» хэсгээс сэргээх боломжтой.": [
    "All lessons will be deleted. A backup is saved first, so you can restore them from Backups.",
    "所有课程将被删除。删除前会保存备份，可在“备份”中恢复。"
  ],
  "Нүд дээр дарж хичээл нэмэх, засах, устгах. Өөрчлөлт хийсний дараа «Хадгалах» дарна. Хадгалах бүрт өмнөх хувилбар нөөцлөгдөнө.": [
    "Click a cell to add, edit or delete a lesson. Choose Save after making changes. Each save backs up the previous version.",
    "点击单元格以添加、编辑或删除课程。更改后点击“保存”。每次保存都会备份之前的版本。"
  ],
  "Нэг цагт хэд хэдэн бүлэг (жишээ нь 12A, 12B) хичээллэдэг бол «Бүлэг нэмэх» дарна.": [
    "Choose Add group when multiple groups, such as 12A and 12B, share a period.",
    "同一课时有多个组别（如 12A、12B）时，点击“添加组别”。"
  ],
  "Түвшний нийтлэг хичээлүүд": [
    "Shared level lessons",
    "分层公共课程"
  ],
  "Ангийн мэдээлэл": [
    "Class information",
    "班级信息"
  ],
  "Ангийн нэрийг «12-2» хэлбэрээр оруулна уу": [
    "Enter the class name in the form 12-2",
    "请输入类似 12-2 的班级名称"
  ],
  "Бүх зураг, видео жижиг хувилбартай": [
    "All photos and videos have thumbnails",
    "所有照片与视频都有缩略图"
  ],
  "Зургийг сервер, видеог энэ хөтөч үүсгэнэ.": [
    "Images are processed by the server; videos by this browser.",
    "图片由服务器处理，视频由此浏览器处理。"
  ],
  "Сервер дээр GD алга тул бүгдийг энэ хөтөч үүсгэнэ (удаан байж болно).": [
    "GD is unavailable on the server, so this browser processes everything. This may take time.",
    "服务器没有 GD，所有内容将由此浏览器处理，可能需要一些时间。"
  ],
  "Зогсоолоо — дахин дарвал үлдсэнээс нь үргэлжилнэ": [
    "Stopped — choose again to continue remaining items",
    "已停止，再次点击可继续处理剩余项目"
  ],
  "Дуустал хуудсаа хаалгүй байна уу.": [
    "Keep this page open until it finishes.",
    "请保持此页面打开，直到完成。"
  ],
  "Нууц үгээ оруулна уу": [
    "Enter your password",
    "请输入密码"
  ],
  "Нууц үгийг шалгаж байна…": [
    "Checking password…",
    "正在验证密码…"
  ],
  "Нууц үг буруу байна. Дахин оролдоно уу.": [
    "Incorrect password. Try again.",
    "密码错误。请重试。"
  ],
  "Код буруу байна. Дахин оролдоно уу.": [
    "Incorrect code. Try again.",
    "密码错误。请重试。"
  ],
  "Нууц үг солигдлоо": [
    "Password changed",
    "密码已修改"
  ],
  "Нууц үг таарахгүй байна": [
    "Passwords do not match",
    "两次输入的密码不一致"
  ],
  "Нууц үг яг 4 цифртэй байх ёстой.": [
    "The password must contain exactly four digits.",
    "密码必须恰好为四位数字。"
  ],
  "Тохиргооны кодоо оруулна уу": [
    "Enter your setup code",
    "请输入设置码"
  ],
  "Бүх хүн цомгоос гарч, шинэ кодоор дахин нэвтэрнэ.": [
    "Everyone will leave the album and sign in again with the new code.",
    "所有人将退出相册，并需使用新密码重新登录。"
  ],
  "Одоогийн код: анхдагч (4200).": [
    "Current code: default (4200).",
    "当前密码：默认值（4200）。"
  ],
  "Админаар нэвтэрсэн тул цомог нээлттэй хэвээр байна": [
    "The album remains unlocked while signed in as administrator",
    "以管理员身份登录时，相册将保持解锁"
  ],
  "Ангийн цомгийг үзэх, зураг нэмэхэд ашиглах 4 оронтой код. Код мэдэх хүн бүр зураг нэмж чадна, харин устгах эрх зөвхөн админд бий. Код солиход бүх хүн цомгоос гарч, шинэ кодоо оруулна.": [
    "Four-digit code for opening the class album and adding photos. Anyone with the code can upload; only the administrator can delete. Changing the code signs everyone out of the album.",
    "用于查看班级相册和添加照片的四位密码。知道密码的人可上传，只有管理员可删除。修改密码后，所有人将退出相册。"
  ],
  "Одоогийн үйлдлийг дуусгаад дахин оролдоно уу.": [
    "Finish the current action and try again.",
    "请完成当前操作后重试。"
  ],
  "Одоогийн үйлдлийг дуусгахыг хүлээгээрэй.": [
    "Wait for the current action to finish.",
    "请等待当前操作完成。"
  ],
  "Оруулалтыг цуцаллаа.": [
    "Upload cancelled.",
    "上传已取消。"
  ],
  "Нээгдлээ": [
    "Opened",
    "已打开"
  ],
  "Нээж байна…": [
    "Opening…",
    "正在打开…"
  ],
  "Идэвхтэй холбоос байхгүй байна.": [
    "No active link.",
    "没有有效链接。"
  ],
  "Зөөх хавтсаа сонгоно уу.": [
    "Choose the destination folder.",
    "请选择目标文件夹。"
  ],
  "Нэг удаад 200 хүртэл файл татах боломжтой.": [
    "You can download up to 200 files at a time.",
    "一次最多可下载 200 个文件。"
  ],
  "Нэг удаад 200 хүртэл файл устгах боломжтой.": [
    "You can delete up to 200 files at a time.",
    "一次最多可删除 200 个文件。"
  ],
  "Нэг ZIP таталтад 200 хүртэл файл, нийт 4 ГБ-аас бага хэмжээ сонгоно уу.": [
    "Choose up to 200 files with a total size below 4 GB for one ZIP download.",
    "每次 ZIP 下载最多选择 200 个文件，总大小须小于 4 GB。"
  ],
  "ZIP татахад сонгосон файлуудын нийт хэмжээ 4 ГБ-аас бага байх ёстой.": [
    "Selected files must total less than 4 GB for ZIP download.",
    "ZIP 下载所选文件的总大小须小于 4 GB。"
  ],
  "Сонгосон файлуудыг бүрмөсөн устгана. Энэ үйлдлийг буцаах боломжгүй.": [
    "Selected files will be permanently deleted. This cannot be undone.",
    "所选文件将被永久删除，无法撤销。"
  ],
  "Баримт": [
    "Document",
    "文档"
  ],
  "Гар зураг": [
    "Drawing",
    "手绘"
  ],
  "PDF оруулах": [
    "Upload PDF",
    "上传 PDF"
  ],
  "PDF оруулаагүй байна.": [
    "No PDF uploaded.",
    "尚未上传 PDF。"
  ],
  "PDF хадгалагдлаа": [
    "PDF saved",
    "PDF 已保存"
  ],
  "PDF устгагдлаа": [
    "PDF deleted",
    "PDF 已删除"
  ],
  "PDF-г устгах уу?": [
    "Delete this PDF?",
    "删除此 PDF？"
  ],
  "PDF, JSON эсвэл CSV файл сонгох": [
    "Choose PDF, JSON or CSV",
    "选择 PDF、JSON 或 CSV"
  ],
  "Зөвхөн PDF, JSON, CSV файл оруулна": [
    "Only PDF, JSON or CSV files are supported",
    "仅支持 PDF、JSON 和 CSV 文件"
  ],
  "PDF-г нүүр хуудсанд «эх хуваарь» болгон хадгалах": [
    "Save PDF as the original timetable on the home page",
    "将 PDF 保存为首页的原始课程表"
  ],
  "JSON файл буруу бүтэцтэй байна": [
    "Invalid JSON structure",
    "JSON 格式无效"
  ],
  "JSON файлд «lessons» жагсаалт алга": [
    "The JSON file has no lessons list",
    "JSON 文件缺少 lessons 列表"
  ],
  "JSON цэгцлэх": [
    "Format JSON",
    "格式化 JSON"
  ],
  "PDF хэрэгсэл": [
    "PDF tools",
    "PDF 工具"
  ],
  "PDF дээр нэмэх текст": [
    "Text to add to PDF",
    "添加到 PDF 的文字"
  ],
  "PDF хуудсыг ачаалж байна…": [
    "Loading PDF pages…",
    "正在加载 PDF 页面…"
  ],
  "PDF дор хаяж нэг хуудастай байх ёстой.": [
    "A PDF must contain at least one page.",
    "PDF 必须至少包含一页。"
  ],
  "PDF хуудсыг харуулж чадсангүй. Файлыг татаж аваад үзнэ үү.": [
    "Could not display the PDF page. Download the file to view it.",
    "无法显示 PDF 页面。请下载文件查看。"
  ],
  "PDF файлыг харуулж чадсангүй. Файлыг татаж аваад үзнэ үү.": [
    "Could not display the PDF. Download the file to view it.",
    "无法显示 PDF。请下载文件查看。"
  ],
  "PDF дээр текст, гар зураг нэмэх, хуудас эргүүлэх, дараалал солих болон устгах боломжтой. Эх PDF-ийн байгаа текстийг энэ энгийн засварлагч өөрчлөхгүй.": [
    "Add text or drawings, rotate, reorder or delete pages. This basic editor does not change the PDF's existing text.",
    "可添加文字或手绘、旋转、排序或删除页面。此基础编辑器不会更改 PDF 中原有的文字。"
  ],
  "Нэмэх текст": [
    "Text to add",
    "要添加的文字"
  ],
  "Нэмэх текстээ бичээд хуудсан дээр дарна уу.": [
    "Write your text, then click the page.",
    "输入文字后点击页面。"
  ],
  "Текст нэмэх": [
    "Add text",
    "添加文字"
  ],
  "Нүд рүү очих": [
    "Go to cell",
    "跳转到单元格"
  ],
  "Нүдний хаяг": [
    "Cell address",
    "单元格地址"
  ],
  "A1 гэх мэт нүдний хаяг оруулаарай.": [
    "Enter a cell address such as A1.",
    "请输入 A1 等单元格地址。"
  ],
  "Нүдний хаяг хүснэгтийн хязгаараас гарсан байна.": [
    "The cell address is outside the spreadsheet.",
    "单元格地址超出了表格范围。"
  ],
  "Сонгосон нүдний утга эсвэл томьёо": [
    "Selected cell value or formula",
    "所选单元格的值或公式"
  ],
  "Томьёо хоосон байна.": [
    "The formula is empty.",
    "公式为空。"
  ],
  "Багана →": [
    "Column →",
    "列 →"
  ],
  "Догол мөр": [
    "Paragraph",
    "段落"
  ],
  "+ Догол мөр нэмэх": [
    "+ Add paragraph",
    "+ 添加段落"
  ],
  "Догол мөрийг налуу болгох": [
    "Italic paragraph",
    "将段落设为斜体"
  ],
  "Догол мөрийг тод болгох": [
    "Bold paragraph",
    "将段落设为粗体"
  ],
  "Баримт урьдчилж харахад хэт том байна.": [
    "The document is too large to preview.",
    "文档太大，无法预览。"
  ],
  "Баримт урьдчилж харахад хэт том байна. Файлыг татаж нээгээрэй.": [
    "The document is too large to preview. Download it to open.",
    "文档太大，无法预览。请下载后打开。"
  ],
  "Баримтын агуулга энгийн засварлагчид хэт том байна.": [
    "The document is too large for the basic editor.",
    "文档内容过大，无法使用基础编辑器打开。"
  ],
  "Баримт 3,000-аас олон догол мөртэй байна. Бүрэн Word засварлагчаар нээгээрэй.": [
    "The document has over 3,000 paragraphs. Open it in the full Word editor.",
    "文档超过 3,000 个段落。请使用完整 Word 编辑器打开。"
  ],
  "Word баримтын агуулгыг харах боломжгүй байна.": [
    "The Word document content cannot be displayed.",
    "无法显示 Word 文档内容。"
  ],
  "Word баримтын бүтэц алдаатай байна.": [
    "The Word document structure is invalid.",
    "Word 文档结构无效。"
  ],
  "Word баримтын текстийг харуулж байна. Зураг болон бүрэн хэлбэржүүлэлтийг татаж эсвэл бүрэн засварлагчаар нээж хараарай.": [
    "Showing the Word document's text. Download or open the full editor to see images and complete formatting.",
    "正在显示 Word 文档文字。请下载文档或使用完整编辑器查看图片及完整格式。"
  ],
  "Вэб засварлагч 32 МБ хүртэл файлыг нээнэ.": [
    "The web editor opens files up to 32 MB.",
    "网页编辑器可打开最大 32 MB 的文件。"
  ],
  "Текст засварлагч 4 MiB хүртэл файл нээнэ.": [
    "The text editor opens files up to 4 MiB.",
    "文字编辑器可打开最大 4 MiB 的文件。"
  ],
  "Бүрэн засварлагчтай холбогдож чадсангүй.": [
    "Could not connect to the full editor.",
    "无法连接完整编辑器。"
  ],
  "Засварлагч ачаалж чадсангүй.": [
    "Could not load the editor.",
    "无法加载编辑器。"
  ],
  "Засварлагч ачаалж чадсангүй. Дахин оролдоно уу.": [
    "Could not load the editor. Try again.",
    "无法加载编辑器。请重试。"
  ],
  "Засварлагч нээгдсэнгүй.": [
    "The editor did not open.",
    "编辑器未能打开。"
  ],
  "Туслах програм олдсонгүй.": [
    "The helper program is unavailable.",
    "辅助程序不可用。"
  ],
  "TXT татах": [
    "Download TXT",
    "下载 TXT"
  ],
  "Текст файлыг татаж аваад үзнэ үү.": [
    "Download the text file to view it.",
    "请下载文字文件查看。"
  ],
  "Татаж аваад үзнэ үү.": [
    "Download to view.",
    "请下载查看。"
  ],
  "Word, Excel болон PDF-ийн бүрэн засварлагчийг сайтын эзэн серверт холбож тохируулна. Тохиргооны заавар сайтын багцад байна.": [
    "The site owner connects the full Word, Excel and PDF editor to a server. Setup instructions are included with the website.",
    "网站所有者需连接服务器，以启用完整 Word、Excel 和 PDF 编辑器。网站包中包含设置说明。"
  ],
  "Word, Excel, PowerPoint болон PDF файлыг бүрэн засахын тулд ONLYOFFICE Document Server холбоно. Сервер суулгах заавар шинэчлэлийн deploy/onlyoffice/README.md файлд бий.": [
    "Connect ONLYOFFICE Document Server for full Word, Excel, PowerPoint and PDF editing. Server instructions are in deploy/onlyoffice/README.md.",
    "连接 ONLYOFFICE Document Server 以完整编辑 Word、Excel、PowerPoint 和 PDF。服务器安装说明位于 deploy/onlyoffice/README.md。"
  ],
  "Document Server-ийн HTTPS хаяг": [
    "Document Server HTTPS URL",
    "Document Server 的 HTTPS 地址"
  ],
  "JWT нууц түлхүүр": [
    "JWT secret",
    "JWT 密钥"
  ],
  "PHP серверээс Document Server рүү холбогдох өөр хаяг шаардлагатай үед.": [
    "Use when PHP needs a different URL to reach Document Server.",
    "当 PHP 需要通过其他地址连接 Document Server 时使用。"
  ],
  "Ажил": [
    "Work",
    "作业"
  ],
  "Ажлаа нээх": [
    "Open my work",
    "打开我的作业"
  ],
  "Ажлын төрөл": [
    "Work type",
    "作业类型"
  ],
  "Миний ажлын дэвтэр": [
    "My workbook",
    "我的练习本"
  ],
  "Ажил вэбсайтаас нээгдлээ. Өөрчлөлт автоматаар хадгалагдана.": [
    "Work loaded from the website. Changes save automatically.",
    "已从网站加载作业。更改将自动保存。"
  ],
  "Ажил вэбсайтад хадгалагдсан байна.": [
    "Your work is saved online.",
    "作业已在线保存。"
  ],
  "Ажлыг вэбсайтад хадгалж байна…": [
    "Saving work online…",
    "正在在线保存作业…"
  ],
  "Ажлыг вэбсайтад хадгаллаа.": [
    "Work saved online.",
    "作业已在线保存。"
  ],
  "Ажлыг хадгалж байна…": [
    "Saving work…",
    "正在保存作业…"
  ],
  "Нэрээ сонгоод хувийн хавтасны 4 оронтой кодоо оруулна уу. Тэмдэглэл, зургийг өөр төхөөрөмжөөс ч нээж болно.": [
    "Choose your name and enter your four-digit folder code. Notes and drawings also open on other devices.",
    "选择姓名并输入个人文件夹的四位密码。也可在其他设备查看笔记与绘图。"
  ],
  "Тэмдэглэл 64 КБ хүртэл байна. TXT татаад тэмдэглэлээ товчлоорой.": [
    "Notes can be up to 64 KB. Download TXT and shorten your notes.",
    "笔记最大为 64 KB。请先下载 TXT，再精简笔记。"
  ],
  "Зургийн хэмжээ дүүрсэн байна. Одоогийн ажлаа TXT хэлбэрээр татаарай.": [
    "The drawing limit is reached. Download your current work as TXT.",
    "绘图容量已满。请将当前内容下载为 TXT。"
  ],
  "Гарвал өөрчлөлт алга болно.": [
    "Leaving will discard your changes.",
    "离开后将丢失更改。"
  ],
  "Вэбсайтад хадгалагдлаа ✓": [
    "Saved online ✓",
    "已在线保存 ✓"
  ],
  "Браузер ноорог хадгалж чадсангүй. «Хадгалах» товчийг дарна уу.": [
    "The browser could not save your draft. Choose Save.",
    "浏览器无法保存草稿。请点击“保存”。"
  ],
  "Сүлжээ тасарлаа. Хадгалаагүй ажлын хуулбарыг энэ төхөөрөмжид үлдээв.": [
    "Connection lost. A copy of unsaved work remains on this device.",
    "连接已断开。未保存的内容已在此设备保留副本。"
  ],
  "Зарим зураг ачаалагдсангүй. Холболт сэргэсний дараа хуудсаа дахин нээгээрэй.": [
    "Some images did not load. Reopen the page when the connection returns.",
    "部分图片未加载。连接恢复后请重新打开页面。"
  ],
  "Зургийн орчныг хэвийн болгох": [
    "Restore drawing area size",
    "恢复绘图区域大小"
  ],
  "Сүүлийн нэмэлтийг буцаах": [
    "Undo last addition",
    "撤销最后一次添加"
  ],
  "Стикер сонгох": [
    "Choose sticker",
    "选择贴纸"
  ],
  "Дурсамжийн зураг нэмэх": [
    "Add a memory photo",
    "添加回忆照片"
  ],
  "GIF нэмэх": [
    "Add GIF",
    "添加 GIF"
  ],
  "GIF & хөдөлгөөнт стикер": [
    "GIFs and animated stickers",
    "GIF 与动态贴纸"
  ],
  "Таны нэр / хоч": [
    "Your name / nickname",
    "你的姓名／昵称"
  ],
  "Бидний төгсөх жил…": [
    "Our graduation year…",
    "我们的毕业年份…"
  ],
  "Бидний хэлэхийг хүссэн үг…": [
    "What we want to say…",
    "我们想说的话…"
  ],
  "Бичээд самбарын хүссэн хэсэгт байрлуулна уу. Хадгалсан бичвэрийг арилгахгүй.": [
    "Write and place it anywhere on the board. Saved text cannot be erased.",
    "输入文字并放置在画板任意位置。已保存的文字无法擦除。"
  ],
  "Сонгоод самбар дээр дарж байрлуулна уу.": [
    "Choose, then click the board to place it.",
    "选择后点击画板放置。"
  ],
  "Зургийг самбарт хуулж байна…": [
    "Copying photo to board…",
    "正在将照片复制到画板…"
  ],
  "Зургийг хуулж чадсангүй": [
    "Could not copy the photo",
    "无法复制照片"
  ],
  "Зургийн хуулбарыг хадгалж байна…": [
    "Saving a copy of the photo…",
    "正在保存照片副本…"
  ],
  "Сонгосон зургийн хуулбар самбарт үлдэнэ. Эх зураг устсан ч дурсамж хадгалагдана.": [
    "A copy stays on the board even if the original photo is deleted.",
    "即使原照片被删除，副本仍会保留在画板上。"
  ],
  "Зураг болон GIF 8 МБ хүртэл байна.": [
    "Photos and GIFs can be up to 8 MB.",
    "照片与 GIF 最大为 8 MB。"
  ],
  "Жижиг — 22": [
    "Small — 22",
    "小 — 22"
  ],
  "Дунд — 32": [
    "Medium — 32",
    "中 — 32"
  ],
  "Том — 48": [
    "Large — 48",
    "大 — 48"
  ],
  "Маш том — 72": [
    "Extra large — 72",
    "超大 — 72"
  ],
  "Дуртай": [
    "Favorite",
    "喜欢"
  ],
  "Зүрх": [
    "Heart",
    "爱心"
  ],
  "Од": [
    "Star",
    "星星"
  ],
  "Солонго": [
    "Rainbow",
    "彩虹"
  ],
  "Гялбаа": [
    "Sparkle",
    "闪光"
  ],
  "Инээмсэглэл": [
    "Smile",
    "笑脸"
  ],
  "Муур": [
    "Cat",
    "猫咪"
  ],
  "Туулай": [
    "Rabbit",
    "兔子"
  ],
  "Мэлхий": [
    "Frog",
    "青蛙"
  ],
  "Бамбарууш": [
    "Teddy bear",
    "泰迪熊"
  ],
  "Медаль": [
    "Medal",
    "奖牌"
  ],
  "Нар": [
    "Sun",
    "太阳"
  ],
  "Сар": [
    "Moon",
    "月亮"
  ],
  "Пянз": [
    "Record",
    "唱片"
  ],
  "Сагс": [
    "Basketball",
    "篮球"
  ],
  "Захиа": [
    "Letter",
    "信件"
  ],
  "Аянга": [
    "Lightning",
    "闪电"
  ],
  "Баяр": [
    "Celebration",
    "庆祝"
  ],
  "Дөрвөлжин": [
    "Square",
    "方形"
  ],
  "Зүрхэн хүрээ": [
    "Heart frame",
    "爱心边框"
  ],
  "Титэм": [
    "Crown",
    "皇冠"
  ],
  "Төгсөгч": [
    "Graduate",
    "毕业生"
  ],
  "Ангийн дэлгэц. Чиний плейлист. Бидний аялгуу.": [
    "Classroom screen. Your playlist. Our soundtrack.",
    "教室屏幕。你的歌单。我们的音乐。"
  ],
  "Ангийн плейлистүүд": [
    "Class playlists",
    "班级歌单"
  ],
  "Ангийн дэлгэцийн бүртгэл": [
    "Classroom display account",
    "教室屏幕账号"
  ],
  "Анхны плейлистээ тавиарай": [
    "Create your first playlist",
    "创建第一个歌单吧"
  ],
  "Миний хогийн сав": [
    "My trash",
    "我的回收站"
  ],
  "Аль плейлистэд нэмэх вэ?": [
    "Which playlist should this go in?",
    "要添加到哪个歌单？"
  ],
  "Дуу хайж энэ плейлистэд нэмээрэй.": [
    "Search a song and add it to this playlist.",
    "搜索歌曲并添加到此歌单。"
  ],
  "Дуу тоглуулахын өмнө дэлгэцийн Spotify-г холбоорой.": [
    "Connect Spotify on this display before playing music.",
    "播放音乐前，请在此屏幕连接 Spotify。"
  ],
  "Тоглуулагч бэлэн болсны дараа Сонсох товчийг дахин дарна уу.": [
    "Choose Listen again when the player is ready.",
    "播放器就绪后，请再次点击“收听”。"
  ],
  "Плейлистийг нээж байна…": [
    "Opening playlist…",
    "正在打开歌单…"
  ],
  "Плейлистүүдийг нээж байна…": [
    "Opening playlists…",
    "正在打开歌单…"
  ],
  "Дуу плейлистэд нэмэгдлээ.": [
    "Song added to playlist.",
    "歌曲已添加到歌单。"
  ],
  "Дуу плейлистээс хасагдлаа.": [
    "Song removed from playlist.",
    "歌曲已从歌单移除。"
  ],
  "Дууны дараалал хадгалагдлаа.": [
    "Song order saved.",
    "歌曲顺序已保存。"
  ],
  "Плейлист хадгалагдлаа.": [
    "Playlist saved.",
    "歌单已保存。"
  ],
  "Плейлист хогийн саванд орлоо.": [
    "Playlist moved to trash.",
    "歌单已移入回收站。"
  ],
  "Плейлист сэргээгдлээ.": [
    "Playlist restored.",
    "歌单已恢复。"
  ],
  "Плейлист үүслээ. Дуугаа нэмээрэй.": [
    "Playlist created. Add your songs.",
    "歌单已创建。添加歌曲吧。"
  ],
  "Плейлист засах эрхийг түгжлээ. Сонсож болно.": [
    "Playlist editing is locked. You can still listen.",
    "歌单编辑权限已锁定，仍可收听。"
  ],
  "Spotify тоглуулагч": [
    "Spotify player",
    "Spotify 播放器"
  ],
  "Spotify тоглуулагч хараахан бэлэн болоогүй байна.": [
    "Spotify player is not ready yet.",
    "Spotify 播放器尚未就绪。"
  ],
  "Spotify тоглуулагч ачаалагдсангүй. Хуудсыг дахин нээнэ үү.": [
    "Spotify player did not load. Reopen the page.",
    "Spotify 播放器未加载。请重新打开页面。"
  ],
  "Spotify серверийн хариу удаж байна. Дахин оролдоорой.": [
    "Spotify is taking too long to respond. Try again.",
    "Spotify 响应时间过长。请重试。"
  ],
  "Spotify түр хязгаарлалаа.": [
    "Spotify temporarily limited requests.",
    "Spotify 暂时限制了请求。"
  ],
  "Spotify холболтын сервер хариу өгсөнгүй. Хэдэн секунд хүлээгээд дахин оролдоорой.": [
    "The Spotify connection server did not respond. Wait a few seconds and try again.",
    "Spotify 连接服务器未响应。请稍等几秒后重试。"
  ],
  "Spotify холболтын хаяг буруу байна.": [
    "The Spotify connection URL is invalid.",
    "Spotify 连接地址无效。"
  ],
  "Spotify-тай холбох": [
    "Connect Spotify",
    "连接 Spotify"
  ],
  "Spotify-тай холбогдоорой": [
    "Connect Spotify",
    "请连接 Spotify"
  ],
  "Spotify-тай холбогдоод плейлистүүдээ нээгээрэй.": [
    "Connect Spotify to open your playlists.",
    "连接 Spotify 以打开你的歌单。"
  ],
  "Spotify дээр нээх ↗": [
    "Open on Spotify ↗",
    "在 Spotify 打开 ↗"
  ],
  "Spotify дээр бүх плейлист ↗": [
    "All playlists on Spotify ↗",
    "Spotify 上的所有歌单 ↗"
  ],
  "Spotify дээр цааш хайх ↗": [
    "Continue search on Spotify ↗",
    "在 Spotify 继续搜索 ↗"
  ],
  "Spotify дээр ↗": [
    "On Spotify ↗",
    "前往 Spotify ↗"
  ],
  "Spotify мэдээлэл": [
    "Spotify information",
    "Spotify 信息"
  ],
  "Spotify нууцлал": [
    "Spotify privacy",
    "Spotify 隐私"
  ],
  "Spotify-ийн нөхцөл": [
    "Spotify terms",
    "Spotify 条款"
  ],
  "Spotify-д тоглуулах хүсэлт илгээлээ.": [
    "Playback request sent to Spotify.",
    "已向 Spotify 发送播放请求。"
  ],
  "Spotify Premium бүртгэлээ энэ дэлгэц дээр холбоно. Хөгжүүлэлтийн горимд Spotify Dashboard-ийн Users and Access жагсаалтад уг бүртгэл зөвшөөрөгдсөн байх хэрэгтэй. 403 алдаа гарвал сайтын эзнээр шалгуулаарай.": [
    "Connect your Spotify Premium account on this display. In development mode the account must be allowed in Dashboard Users and Access. Ask the site owner to check if a 403 occurs.",
    "在此屏幕连接 Spotify Premium 账号。开发模式下，该账号须在 Dashboard 的 Users and Access 中获准访问。如出现 403，请让网站所有者检查。"
  ],
  "4 зураг авах": [
    "Take 4 photos",
    "拍摄 4 张照片"
  ],
  "4 зураг сонгох": [
    "Choose 4 photos",
    "选择 4 张照片"
  ],
  "4 зураг · PNG татах": [
    "4 photos · download PNG",
    "4 张照片 · 下载 PNG"
  ],
  "4 зураг болон GIF-д хэрэглэнэ.": [
    "Applies to all 4 photos and the GIF.",
    "应用于全部 4 张照片和 GIF。"
  ],
  "Photobooth камерын шууд дүрс": [
    "Photobooth live camera",
    "拍照亭实时相机画面"
  ],
  "Photobooth үр дүн": [
    "Photobooth result",
    "拍照亭成品"
  ],
  "Photobooth руу": [
    "Back to Photobooth",
    "返回拍照亭"
  ],
  "Камер": [
    "Camera",
    "相机"
  ],
  "Камер асаалттай · Дуу бичихгүй": [
    "Camera on · no audio recording",
    "相机已打开 · 不录音"
  ],
  "Камер унтраалаа. Авсан зураг хэвээр үлдэнэ.": [
    "Camera stopped. Your photos are kept.",
    "相机已关闭。已拍摄的照片仍会保留。"
  ],
  "Камерын зөвшөөрөл хүлээж байна…": [
    "Waiting for camera permission…",
    "等待相机权限…"
  ],
  "Камерын холболт тасарлаа. Дахин асааж болно.": [
    "Camera connection lost. You can start it again.",
    "相机连接已断开。可以重新打开。"
  ],
  "Камерын зөвшөөрөл өгөөгүй байна. Хөтчийн камерын тохиргоог нээгээд дахин оролдоорой.": [
    "Camera permission was denied. Check browser camera settings and try again.",
    "未获得相机权限。请检查浏览器相机设置后重试。"
  ],
  "Камер HTTPS холболттой сайтад ажиллана. Доороос 4 зураг сонгож болно.": [
    "The camera needs an HTTPS website. You can choose 4 photos below instead.",
    "相机需要 HTTPS 网站。也可在下方选择 4 张照片。"
  ],
  "Камераа нээж чадсангүй. Холболтоо шалгах эсвэл доороос 4 зураг сонгоорой.": [
    "Could not open the camera. Check the connection or choose 4 photos below.",
    "无法打开相机。请检查连接，或在下方选择 4 张照片。"
  ],
  "Позоо аваарай. Зураг бүрийн өмнө 3 секунд тоолно.": [
    "Strike a pose. Each photo starts after a three-second countdown.",
    "摆好姿势。每张照片拍摄前会倒计时三秒。"
  ],
  "Дөрвөн зураг бэлэн. Жааз, фильтр, стикерээ сонгоорой.": [
    "Four photos ready. Choose your frame, filters and stickers.",
    "四张照片已就绪。请选择相框、滤镜和贴纸。"
  ],
  "Дөрвөн зургаа аваад дэвсгэрээ сонгоорой.": [
    "Take your four photos, then choose a background.",
    "拍摄四张照片后选择背景。"
  ],
  "Дахин зураг авч болно.": [
    "You can take photos again.",
    "可以重新拍摄。"
  ],
  "Боллоо. Стикерээ байрлуулаад зураг татах эсвэл цомогт хадгалаарай.": [
    "Ready. Place your stickers, then download or save to the album.",
    "已就绪。放置贴纸后，可下载或保存到相册。"
  ],
  "PNG зураг бэлэн.": [
    "PNG photo ready.",
    "PNG 照片已就绪。"
  ],
  "Амьд зураг": [
    "Live photo",
    "动态照片"
  ],
  "Амьд зураг GIF хэлбэрээр бэлэн.": [
    "Your live photo is ready as a GIF.",
    "动态照片 GIF 已就绪。"
  ],
  "GIF бэлдэж байна…": [
    "Preparing GIF…",
    "正在生成 GIF…"
  ],
  "GIF бэлдэж чадсангүй. PNG зургаа татаж болно.": [
    "Could not create GIF. You can download the PNG.",
    "无法生成 GIF。可以下载 PNG。"
  ],
  "GIF бэлдэх хугацаа дууслаа. PNG зургаа татаж болно.": [
    "GIF creation timed out. You can download the PNG.",
    "GIF 生成超时。可以下载 PNG。"
  ],
  "GIF хэрэгсэл ачаалагдаагүй байна. Хуудсаа дахин нээгээрэй.": [
    "The GIF tool did not load. Reopen the page.",
    "GIF 工具未加载。请重新打开页面。"
  ],
  "Вэбсайтад хадгалахаар бэлдэж байна…": [
    "Preparing to save online…",
    "准备在线保存…"
  ],
  "Зургаа цомогт хадгалж байна…": [
    "Saving photos to the album…",
    "正在将照片保存到相册…"
  ],
  "Зураг бэлдэж чадсангүй.": [
    "Could not prepare the photo.",
    "无法生成照片。"
  ],
  "Зураг боловсруулах хэрэгсэл бэлдэж байна…": [
    "Loading image tools…",
    "正在加载图片处理工具…"
  ],
  "Зураг боловсруулах хэрэгсэл ачаалагдаагүй байна.": [
    "Image tools did not load.",
    "图片处理工具未加载。"
  ],
  "Зургийг нээж чадсангүй.": [
    "Could not open the image.",
    "无法打开图片。"
  ],
  "Зургийг татаж чадсангүй.": [
    "Could not download the image.",
    "无法下载图片。"
  ],
  "Зураг хэт том байна. Жижигрүүлээд дахин сонгоорой.": [
    "The image is too large. Resize it and choose again.",
    "图片过大。请缩小后重新选择。"
  ],
  "Зураг серверийн зөвшөөрсөн хэмжээнээс том байна. PNG зургаа шууд татаж болно.": [
    "The photo exceeds the server limit. You can download the PNG directly.",
    "照片超过服务器限制。可以直接下载 PNG。"
  ],
  "Амьд GIF серверийн зөвшөөрсөн хэмжээнд багтахгүй байна. PNG болон GIF-ээ шууд татаж аваарай, эсвэл сайтын эзнээр файл хадгалах хэмжээг нэмүүлээрэй.": [
    "The live GIF exceeds the server limit. Download PNG and GIF directly, or ask the owner to increase the upload limit.",
    "动态 GIF 超过服务器限制。可直接下载 PNG 与 GIF，或请网站所有者提高上传限制。"
  ],
  "PNG, JPG эсвэл WEBP төрлийн 20 МБ хүртэлх 4 зураг сонгоорой.": [
    "Choose 4 PNG, JPG or WEBP photos, each up to 20 MB.",
    "请选择 4 张 PNG、JPG 或 WEBP 照片，每张最大 20 MB。"
  ],
  "Нүүр олдсонгүй. Камер руу харж, илүү гэрэлтэй газар дахин аваарай.": [
    "No face found. Look at the camera and retake in better lighting.",
    "未识别到面部。请面向相机，在光线更好的地方重拍。"
  ],
  "Нүүрний эффект бэлэн.": [
    "Face effect ready.",
    "面部特效已就绪。"
  ],
  "Нүүрний эффект сонголоо. Дөрвөн зургаа авсны дараа хэрэглэнэ.": [
    "Face effect selected. It applies after taking all four photos.",
    "已选择面部特效。拍完四张照片后将应用。"
  ],
  "AI CHAT-ыг нээж байна…": [
    "Opening AI CHAT…",
    "正在打开 AI 聊天…"
  ],
  "AI яриа": [
    "AI conversation",
    "AI 对话"
  ],
  "Асуултаа 4000 тэмдэгтээс бага бичээрэй.": [
    "Keep your question below 4,000 characters.",
    "请将问题控制在 4,000 个字符以内。"
  ],
  "Зурвасаа бэлдэж болно. Илгээхэд хавтасны кодоороо нэвтэрнэ.": [
    "You can draft a message now. Sign in with your folder code to send.",
    "可以先草拟消息。发送时需用文件夹密码登录。"
  ],
  "Илгээхийн өмнө нэрээ сонгоорой. Бичсэн зурвас чинь хэвээрээ үлдэнэ.": [
    "Choose your name before sending. Your draft will be kept.",
    "发送前请选择姓名。草稿会保留。"
  ],
  "Илгээхийн өмнө админ Egune API тохиргоог хийнэ. Бичсэн зурвас чинь хэвээрээ үлдэнэ.": [
    "The administrator must configure Egune API before sending. Your draft is kept.",
    "发送前管理员需配置 Egune API。草稿会保留。"
  ],
  "AI тохиргоо хараахан хийгдээгүй байна. Админ Egune түлхүүрээ оруулна уу.": [
    "AI setup is incomplete. The administrator needs to add an Egune key.",
    "AI 尚未完成设置。管理员需添加 Egune 密钥。"
  ],
  "AI тохиргоо хараахан хийгдээгүй байна. Админ Egune түлхүүрээ оруулна уу. Бичсэн зурвас чинь хэвээрээ үлдэнэ.": [
    "AI setup is incomplete. The administrator needs to add an Egune key. Your draft is kept.",
    "AI 尚未完成设置。管理员需添加 Egune 密钥。草稿会保留。"
  ],
  "IwnlX AI · Egune API-аар ажиллана. AI алдаа гаргаж болно — чухал хариултыг нягтлаарай. Хүсэлт зөвхөн “Илгээх” дарахад үүснэ.": [
    "IwnlX AI uses Egune API. AI may make mistakes; check important answers. Requests are made only when you choose Send.",
    "IwnlX AI 使用 Egune API。AI 可能出错，请核实重要回答。只有点击“发送”时才会发起请求。"
  ],
  "Сүлжээний алдаа. Яриаг дахин нээж хариу хадгалагдсан эсэхийг шалгаарай.": [
    "Network error. Reopen the conversation to check whether the answer was saved.",
    "网络错误。请重新打开对话，检查回答是否已保存。"
  ],
  "Сүлжээний алдаа. Холболтоо шалгаад дахин оролдоорой.": [
    "Network error. Check the connection and try again.",
    "网络错误。请检查连接后重试。"
  ],
  "Интернэт холболтоо шалгана уу.": [
    "Check your internet connection.",
    "请检查互联网连接。"
  ],
  "Egune API түлхүүр": [
    "Egune API key",
    "Egune API 密钥"
  ],
  "Egune-ийн нийт хэрэглээний тооцоолсон хязгаар (₮)": [
    "Estimated Egune total spending limit (₮)",
    "Egune 总费用估算上限（₮）"
  ],
  "(заавал биш)": [
    "(optional)",
    "（可选）"
  ],
  "Энэ хөтөч бүтэн дэлгэцийг дэмжихгүй байна.": [
    "This browser does not support fullscreen.",
    "此浏览器不支持全屏。"
  ],
  "ӨНӨӨДРИЙН ХИЧЭЭЛ ДУУСЛАА": [
    "TODAY’S LESSONS ARE FINISHED",
    "今日课程已结束"
  ],
  "Өнөөдрийн хичээл дууслаа": [
    "Today’s lessons are finished",
    "今日课程已结束"
  ]
};
  var messages = {
  "Хуваарь оруулаагүй байна": ["Хуваарь оруулаагүй байна", "No timetable yet", "尚未添加课程表"],
  "Удирдлага хэсгээс хуваариа оруулна уу.": ["Удирдлага хэсгээс хуваариа оруулна уу.", "Add the timetable from the Administration page.", "请在管理页面添加课程表。"],
  "Хуваарь хараахан оруулаагүй байна.": ["Хуваарь хараахан оруулаагүй байна.", "The timetable hasn’t been added yet.", "课程表尚未添加。"],
  "nav.group.lessons": ["Хичээл", "Lessons", "课程"],
  "nav.group.study": ["Сурах", "Study", "学习"],
  "nav.group.create": ["Бүтээл ба дурсамж", "Create & memories", "创作与回忆"],
  "nav.group.fun": ["Чөлөөт цаг", "Free time", "休闲"],
  "home.launch": ["Хурдан нээх", "Quick launch", "快速打开"],
  "home.tile.music": ["Дуу сонсох", "Listen to songs", "听歌"],
  "home.tile.google": ["Хайх, сурах", "Search & learn", "搜索与学习"],
  "home.tile.games": ["Ludo, Chooser…", "Ludo, Chooser…", "飞行棋、选人…"],
  "home.tile.ai": ["Асуулт асуух", "Ask a question", "提个问题"],
  "home.tile.books": ["12-р ангийн ном", "Grade 12 books", "12 年级课本"],
  "home.tile.folders": ["Миний файлууд", "My files", "我的文件"],
  "home.tile.doodle": ["Зурж үлдээх", "Draw a memory", "画下回忆"],
  "home.tile.youtube": ["Хамтдаа үзэх", "Watch together", "一起观看"],
  "home.greet.night": ["Сайхан амраарай", "Good night", "晚安"],
  "home.greet.morning": ["Өглөөний мэнд", "Good morning", "早上好"],
  "home.greet.day": ["Өдрийн мэнд", "Good afternoon", "下午好"],
  "home.greet.evening": ["Оройн мэнд", "Good evening", "晚上好"],
  "google.ours": ["Манай сайт дээр", "On our site", "在我们的网站上"],
  "google.onSite": ["12-2 сайт дээр", "On the 12-2 site", "在 12-2 网站"],
  "google.blockedTitle": ["Энэ сайтыг энд нээх боломжгүй", "This site can’t open here", "此网站无法在这里打开"],
  "google.blockedText": ["«{site}» өөр сайт дотор нээгдэхийг зөвшөөрдөггүй. Манай сайт дээр үлдээд өөр зүйл сонгоорой 😊", "“{site}” doesn’t allow being shown inside another site. Stay here and pick something else 😊", "“{site}”不允许在其他网站中显示。留在这里，选点别的吧 😊"],
  "google.backHome": ["Нүүр рүү буцах", "Back to start", "返回首页"],
  "google.searchGoogle": ["Google-ээс хайх", "Search Google", "在 Google 搜索"],
  "google.stayHint": ["Сайт харагдахгүй бол Нүүр товчоор буцаад өөр сайт сонгоорой.", "If a site doesn’t show, press Home and pick another one.", "如果网站没有显示，请按主页并选择其他网站。"],
  "nav.google": ["GOOGLE", "GOOGLE", "GOOGLE"],
  "google.tagline": ["Хайж, сайтаар зочилж, тоглоод — бүгд энд.", "Search, visit sites and play — all in one place.", "搜索、浏览网站、玩游戏——尽在这里。"],
  "google.back": ["Буцах", "Back", "后退"],
  "google.forward": ["Урагшлах", "Forward", "前进"],
  "google.reload": ["Дахин ачаалах", "Reload", "重新加载"],
  "google.home": ["Нүүр", "Home", "主页"],
  "google.addressLabel": ["Хайх эсвэл хаяг бичих", "Search or type an address", "搜索或输入网址"],
  "google.placeholder": ["Google-ээс хайх эсвэл сайтын хаяг бичих…", "Search Google or type a site address…", "在 Google 中搜索或输入网址…"],
  "google.go": ["Хайх", "Go", "前往"],
  "google.star": ["Миний сайтад нэмэх", "Add to My sites", "添加到我的网站"],
  "google.newTab": ["Шинэ табд нээх", "Open in new tab", "在新标签页中打开"],
  "google.bigPlaceholder": ["Юу хайх вэ?", "What are you looking for?", "想搜索什么？"],
  "google.search": ["Хайх", "Search", "搜索"],
  "google.safe": ["SafeSearch асаалттай — ангид тохирох үр дүн.", "SafeSearch is on — class-friendly results.", "已开启安全搜索——适合课堂的结果。"],
  "google.favorites": ["Миний сайтууд", "My sites", "我的网站"],
  "google.learn": ["Хайх ба сурах", "Search & learn", "搜索与学习"],
  "google.play": ["Тоглох", "Play", "游戏"],
  "google.recent": ["Сүүлд нээсэн", "Recently opened", "最近打开"],
  "google.clear": ["Цэвэрлэх", "Clear", "清除"],
  "google.frameTitle": ["Вэб хуудас", "Web page", "网页"],
  "google.blockedHint": ["Сайт энд нээгдэхгүй байна уу?", "Site not loading here?", "网站在这里打不开？"],
  "google.badUrl": ["Ийм хаягийг нээх боломжгүй.", "This address can’t be opened.", "无法打开此地址。"],
  "google.openedTab": ["{site} шинэ табд нээгдлээ.", "{site} opened in a new tab.", "{site} 已在新标签页中打开。"],
  "google.toYouTube": ["YouTube хэсэгт нээлээ.", "Opened in the YouTube section.", "已在 YouTube 栏目中打开。"],
  "google.starred": ["Миний сайтуудад нэмлээ ⭐", "Added to My sites ⭐", "已添加到我的网站 ⭐"],
  "google.unstarred": ["Миний сайтуудаас хаслаа.", "Removed from My sites.", "已从我的网站中移除。"],
  "google.remove": ["Хасах", "Remove", "移除"],
  "google.ready": ["Хайх зүйлээ бичээрэй, эсвэл доорх сайтаас сонгоорой.", "Type what you want to find, or pick a site below.", "输入想搜索的内容，或从下方选择网站。"],
  "google.site.maps": ["Газрын зураг", "Maps", "地图"],
  "google.site.translate": ["Орчуулга", "Translate", "翻译"],
  "google.site.chessPuzzle": ["Шатрын бодлого", "Chess puzzle", "国际象棋谜题"],
  "google.site.typing": ["Хурдан бичих", "Typing test", "打字练习"],
  "ludo.tagline": ["2–4 хүн. Нэг дэлгэц дээр ээлжлэн тоглоно.", "2–4 players taking turns on one screen.", "2–4 人，在同一屏幕上轮流玩。"],
  "ludo.setupTitle": ["Тоглогчид", "Players", "玩家"],
  "ludo.setupHint": ["Нэрээ бичээд, өнгөө сонгоорой.", "Write your names and pick your colors.", "写上名字，选择颜色。"],
  "ludo.howMany": ["Тоглогчийн тоо", "Number of players", "玩家人数"],
  "ludo.resume": ["Өмнөх тоглоомоо үргэлжлүүлэх", "Resume last game", "继续上一局"],
  "ludo.start": ["Тоглоом эхлэх", "Start game", "开始游戏"],
  "ludo.rules": ["6 буувал хүү гарна · өрсөлдөгчийг цохиж гэрт нь буцаана · бүх хүүгээ төвд аваачвал яллана.", "Roll a 6 to leave base · land on a rival to send them home · get all four pieces to the centre to win.", "掷出 6 才能出发 · 踩中对手可将其送回家 · 四个棋子全部到达中心即获胜。"],
  "ludo.newGame": ["Шинэ тоглоом", "New game", "新游戏"],
  "ludo.board": ["Ludo самбар", "Ludo board", "飞行棋棋盘"],
  "ludo.turn": ["Ээлж", "Turn", "回合"],
  "ludo.roll": ["Шоо шидэх", "Roll the die", "掷骰子"],
  "ludo.rollHint": ["Шоон дээр дар · Space", "Tap the die · Space", "点击骰子 · 空格键"],
  "ludo.wins": ["яллаа! 🎉", "wins! 🎉", "获胜！🎉"],
  "ludo.continue": ["Бусад байрын төлөө үргэлжлүүлэх", "Keep playing for the other places", "继续争夺其他名次"],
  "ludo.changePlayers": ["Тоглогч солих", "Change players", "更换玩家"],
  "ludo.rematch": ["Дахин тоглох", "Play again", "再玩一次"],
  "ludo.color.red": ["Улаан", "Red", "红色"],
  "ludo.color.green": ["Ногоон", "Green", "绿色"],
  "ludo.color.yellow": ["Шар", "Yellow", "黄色"],
  "ludo.color.blue": ["Цэнхэр", "Blue", "蓝色"],
  "ludo.color.purple": ["Нил ягаан", "Purple", "紫色"],
  "ludo.color.pink": ["Ягаан", "Pink", "粉色"],
  "ludo.color.orange": ["Улбар шар", "Orange", "橙色"],
  "ludo.color.teal": ["Оюу", "Teal", "青色"],
  "ludo.playerN": ["Тоглогч {n}", "Player {n}", "玩家 {n}"],
  "ludo.home": ["төвд", "home", "到达"],
  "ludo.threeSixes": ["Гурван зургаа! {name}-ийн ээлж шатлаа 🙈", "Three sixes! {name} loses the turn 🙈", "连续三个 6！{name} 失去本回合 🙈"],
  "ludo.sixAgain": ["Зургаа! {name} дахин шиднэ.", "A six! {name} rolls again.", "6 点！{name} 再掷一次。"],
  "ludo.noMove": ["Явах боломжгүй — дараагийн тоглогч.", "No move possible — next player.", "无法移动——轮到下一位。"],
  "ludo.autoMove": ["Явуулж байна…", "Moving…", "移动中…"],
  "ludo.pick": ["{name}, явуулах хүүгээ сонго.", "{name}, pick a piece to move.", "{name}，选择要移动的棋子。"],
  "ludo.pow": ["БАМ!", "BAM!", "砰！"],
  "ludo.capture": ["БАМ! {name} {victim}-г гэрт нь буцаалаа!", "BAM! {name} sent {victim} home!", "砰！{name} 把 {victim} 送回了家！"],
  "ludo.homeOne": ["Нэг хүү төвд хүрлээ! Дахин шид.", "A piece reached the centre! Roll again.", "一个棋子到达中心！再掷一次。"],
  "ludo.place": ["{place}-р байр", "Place {place}", "第 {place} 名"],
  "ludo.yourRoll": ["{name} — шидэх ээлж!", "{name} — your roll!", "{name}——该你掷骰子了！"],
  "ludo.nameLabel": ["{n}-р тоглогчийн нэр", "Player {n} name", "玩家 {n} 的名字"],
  "ludo.colorLabel": ["Өнгө", "Color", "颜色"],
  "ludo.confirmTitle": ["Шинэ тоглоом эхлүүлэх үү?", "Start a new game?", "开始新游戏吗？"],
  "ludo.confirmText": ["Одоогийн тоглоомын явц устна.", "The current game will be lost.", "当前对局进度将丢失。"],
  "ludo.confirmOk": ["Тийм, шинээр эхлэх", "Yes, start over", "是的，重新开始"],
  "chooser.tagline": ["Камер ангийн царайг хараад нэгийг санамсаргүй сонгоно.", "The camera looks at the class and randomly picks one face.", "摄像头扫描全班，随机选出一张脸。"],
  "chooser.howTo": ["Хэрхэн тоглох", "How to play", "玩法"],
  "chooser.step1": ["Камераа асаа", "Turn on the camera", "打开摄像头"],
  "chooser.step2": ["Бүгд камерт харагд", "Everyone get in view", "所有人进入画面"],
  "chooser.step3": ["«Сонгох» дар", "Press “Pick”", "按“选择”"],
  "chooser.bannerSub": ["ӨНӨӨДРИЙН АЗТАН", "TODAY’S LUCKY ONE", "今日幸运儿"],
  "chooser.banner": ["СОНГОГДЛОО!", "CHOSEN!", "就是你！"],
  "chooser.idleTitle": ["Камераа асаа", "Turn on the camera", "打开摄像头"],
  "chooser.idleHint": ["Ангиа камерт харуулаад «Сонгох» дарна.", "Point the camera at the class and press “Pick”.", "将摄像头对准全班，然后按“选择”。"],
  "chooser.start": ["Камер асаах", "Start camera", "开启摄像头"],
  "chooser.flip": ["Камер солих", "Switch camera", "切换摄像头"],
  "chooser.choose": ["Сонгох", "Pick", "选择"],
  "chooser.again": ["Дахин сонгох", "Pick again", "再选一次"],
  "chooser.stop": ["Камер унтраах", "Turn camera off", "关闭摄像头"],
  "chooser.keys": ["Space — сонгох · R — дахин", "Space — pick · R — again", "空格——选择 · R——再来"],
  "chooser.privacy": ["Царайг зөвхөн энэ төхөөрөмж дээр боловсруулна — хадгалж, илгээхгүй.", "Faces are processed only on this device — never saved or sent.", "人脸仅在本设备上处理——不会保存或上传。"],
  "chooser.faces": ["{count} царай", "{count} faces", "{count} 张脸"],
  "chooser.noFaces": ["Царай хайж байна…", "Looking for faces…", "正在寻找人脸…"],
  "chooser.loading": ["Царай таних хэрэгслийг ачаалж байна…", "Loading face detection…", "正在加载人脸识别…"],
  "chooser.noCam": ["Энэ төхөөрөмж дээр камер ашиглах боломжгүй байна.", "The camera isn’t available on this device.", "此设备无法使用摄像头。"],
  "chooser.moveIn": ["Камерт царай харагдахгүй байна. Ойртоно уу.", "No faces in view. Move closer.", "画面中没有人脸，请靠近一些。"],
  "chooser.scanning": ["Хэн байх бол…? 🥁", "Who will it be…? 🥁", "会是谁呢……？🥁"],
  "chooser.lost": ["Царай алга болсон. Дахин оролдоно уу.", "The faces disappeared. Try again.", "人脸消失了，请重试。"],
  "chooser.chosenMsg": ["Баяр хүргэе! 🎉 Дахин сонгох бол «Дахин сонгох» дар.", "Congrats! 🎉 Press “Pick again” for another round.", "恭喜！🎉 按“再选一次”再来一轮。"],
  "chooser.ready": ["Бэлэн! «Сонгох» дарна уу.", "Ready! Press “Pick”.", "准备好了！请按“选择”。"],
  "chooser.starting": ["Камер асааж байна…", "Starting the camera…", "正在开启摄像头…"],
  "chooser.denied": ["Камерын зөвшөөрөл өгөөгүй байна. Хөтчийн зөвшөөрлийг нээнэ үү.", "Camera permission was denied. Allow it in the browser settings.", "未授予摄像头权限，请在浏览器设置中允许。"],
  "chooser.failed": ["Камер эсвэл царай таних хэрэгсэл ачаалагдсангүй.", "The camera or face detection didn’t load.", "摄像头或人脸识别加载失败。"],
  "music.badge": ["Дуртай дуугаа хайгаарай.", "Find the songs you love.", "搜索你喜欢的歌曲。"],
  "music.searchTitle": ["Spotify-оос дуу хайх", "Search songs on Spotify", "在 Spotify 搜索歌曲"],
  "music.searchPlaceholder": ["Spotify-оос дуу, дуучин хайх…", "Search Spotify for songs or artists…", "在 Spotify 搜索歌曲或歌手…"],
  "music.audioTrack": ["Аудио", "Audio", "音频"],
  "nav.games": ["Тоглоомууд", "Games", "游戏"],
  "games.hint": ["Сурах, тоглох, азаа үзэх — нэг дор.", "Learn, play and pick someone — all in one place.", "学习、游戏和随机选择，尽在一处。"],
  "sfx.on": ["Дуу: асаалттай", "Sound: on", "声音：开"],
  "sfx.off": ["Дуу: унтраалттай", "Sound: off", "声音：关"],
  "nav.youtube": ["YouTube", "YouTube", "YouTube"],
  "nav.exitFullscreen": [
    "Бүтэн дэлгэцээс гарах",
    "Exit full screen",
    "退出全屏"
  ],
  "nav.fullscreenUnsupported": [
    "Энэ хөтөч бүтэн дэлгэцийг дэмжихгүй байна. iPhone дээр Safari-ийн «Хуваалцах» → «Үндсэн дэлгэцэнд нэмэх» ашиглан апп болгон нээвэл бүтэн дэлгэцээр нээгдэнэ.",
    "This browser cannot show the page full screen. On iPhone, use Safari's Share → Add to Home Screen and open the site from the Home Screen to get full screen.",
    "此浏览器不支持全屏显示。在 iPhone 上请用 Safari 的“分享”→“添加到主屏幕”，再从主屏幕打开，即可全屏。"
  ],
  "nav.fullscreenBlocked": [
    "Бүтэн дэлгэц нээгдсэнгүй. Дахин оролдоно уу.",
    "Full screen did not open. Please try again.",
    "未能进入全屏，请重试。"
  ],
  "intercom.listen": [
    "Intercom сонсох",
    "Listen to Intercom",
    "收听广播"
  ],
  "intercom.listening": [
    "Intercom сонсож байна — зогсоох",
    "Listening to Intercom — stop",
    "正在收听广播 — 停止"
  ],
  "intercom.pillListening": [
    "Intercom · сонсож байна",
    "Intercom · listening",
    "广播 · 收听中"
  ],
  "intercom.pillPlaying": [
    "Intercom · зарлал тоглож байна…",
    "Intercom · playing an announcement…",
    "广播 · 正在播放通知…"
  ],
  "intercom.pillLocked": [
    "Intercom · дууг идэвхжүүлэхийн тулд дэлгэц дээр товшино уу",
    "Intercom · tap the screen once to enable sound",
    "广播 · 请点按屏幕一次以启用声音"
  ],
  "intercom.pillAuth": [
    "Intercom · Цомгийн кодоор нэвтэрнэ үү",
    "Intercom · enter the Album code to connect",
    "广播 · 请输入相册代码以连接"
  ],
  "intercom.pillOffline": [
    "Intercom · холболт тасарсан, дахин оролдож байна",
    "Intercom · connection lost, retrying",
    "广播 · 连接中断，正在重试"
  ],
  "intercom.toastOn": [
    "Intercom сонсож байна. Багшийн зарлал энэ дэлгэцээр тоглоно.",
    "Listening to Intercom. The teacher's announcements will play on this screen.",
    "正在收听广播，老师的通知将在此屏幕播放。"
  ],
  "intercom.toastOff": [
    "Intercom сонсохыг зогсоолоо.",
    "Stopped listening to Intercom.",
    "已停止收听广播。"
  ],
  "intercom.playFailed": [
    "Intercom зарлалыг тоглуулж чадсангүй.",
    "The Intercom announcement could not be played.",
    "无法播放广播通知。"
  ],
  "intercom.lead": [
    "Товчийг дарж яриагаа бичээд дахин дарахад сонсож буй дэлгэцүүдээр тоглоно. Эхлээд дуудлагын хөгжим тоглож, дууссаны дараа таны зарлал сонсогдоно.",
    "Press the button and speak, then press it again: the announcement plays on every listening display. The call chime plays first, and your announcement follows when it ends.",
    "点按按钮并讲话，再次点按后，通知会在所有收听中的屏幕上播放。先播放来电提示音，结束后播放您的通知。"
  ],
  "intercom.noListeners": [
    "Сонсож буй дэлгэц алга",
    "No displays listening",
    "没有正在收听的屏幕"
  ],
  "intercom.listeningCount": [
    "{count} дэлгэц сонсож байна",
    "{count} display(s) listening",
    "{count} 个屏幕正在收听"
  ],
  "intercom.notReady": [
    " · {count} дэлгэцэд дууг идэвхжүүлээгүй",
    " · sound not enabled on {count}",
    " · {count} 个屏幕尚未启用声音"
  ],
  "intercom.idle": [
    "Бэлэн. INTERCOM товчийг дарж ярьж эхэлнэ үү.",
    "Ready. Press INTERCOM and start speaking.",
    "就绪。点按 INTERCOM 开始讲话。"
  ],
  "intercom.cancel": [
    "Цуцлах",
    "Cancel",
    "取消"
  ],
  "intercom.btnSend": [
    "ИЛГЭЭХ",
    "SEND",
    "发送"
  ],
  "intercom.howTitle": [
    "Дэлгэцийг хэрхэн холбох вэ?",
    "How do I connect a display?",
    "如何连接屏幕？"
  ],
  "intercom.how1": [
    "Анги дахь дэлгэц дээр сайтыг нээнэ.",
    "Open the website on the classroom display.",
    "在教室屏幕上打开网站。"
  ],
  "intercom.how2": [
    "Цэс → «Intercom сонсох» товчийг дарна. Анх удаа Цомгийн кодоор (4 оронтой) нэвтэрнэ.",
    "Menu → press “Listen to Intercom”. The first time, sign in with the Album code (4 digits).",
    "菜单 → 点按“收听广播”。首次需要输入相册代码（4 位数字）。"
  ],
  "intercom.how3": [
    "Дэлгэц 30 хоног хүртэл холбоотой үлдэнэ. Дууг хөтөч хаасан/дахин ачаалсны дараа нэг товшиж идэвхжүүлэх шаардлага гарч болно.",
    "A display stays connected for up to 30 days. After the browser is closed or reloaded, one tap on the screen may be needed to enable sound.",
    "屏幕最多保持连接 30 天。浏览器关闭或刷新后，可能需要点按屏幕一次以启用声音。"
  ],
  "intercom.recent": [
    "Сүүлийн зарлалууд",
    "Recent announcements",
    "最近的通知"
  ],
  "intercom.clear": [
    "Бүгдийг устгах",
    "Delete all",
    "全部删除"
  ],
  "intercom.none": [
    "Одоогоор илгээсэн зарлал алга. Дээрх микрофон товчийг дарж эхний зарлалаа бичээрэй.",
    "No announcements sent yet. Press the microphone button above to record your first one.",
    "还没有发送过通知。点按上方的麦克风按钮录制第一条。"
  ],
  "intercom.play": [
    "Сонсох",
    "Play",
    "播放"
  ],
  "intercom.stop": [
    "Зогсоох",
    "Stop",
    "停止"
  ],
  "intercom.delivered": [
    "{count} дэлгэцэнд тоглосон",
    "played on {count} display(s)",
    "已在 {count} 个屏幕播放"
  ],
  "intercom.confirmClear": [
    "Бүх зарлалыг серверээс устгах уу?",
    "Delete all announcements from the server?",
    "要从服务器删除所有通知吗？"
  ],
  "intercom.clearFailed": [
    "Устгаж чадсангүй.",
    "Could not delete.",
    "无法删除。"
  ],
  "intercom.previewFailed": [
    "Бичлэгийг тоглуулж чадсангүй.",
    "Could not play the recording.",
    "无法播放录音。"
  ],
  "intercom.starting": [
    "Микрофоны зөвшөөрөл хүлээж байна…",
    "Waiting for microphone permission…",
    "正在等待麦克风权限…"
  ],
  "intercom.recording": [
    "Бичиж байна… Ярьж дуусаад INTERCOM товчийг дахин дарж илгээнэ үү.",
    "Recording… When you finish speaking, press INTERCOM again to send.",
    "录音中… 讲完后请再次点按 INTERCOM 发送。"
  ],
  "intercom.sending": [
    "Илгээж байна…",
    "Sending…",
    "发送中…"
  ],
  "intercom.sent": [
    "Илгээгдлээ. {count} дэлгэц сонсож байна.",
    "Sent. {count} display(s) listening.",
    "已发送。{count} 个屏幕正在收听。"
  ],
  "intercom.sentNone": [
    "Илгээгдлээ, гэхдээ одоогоор сонсож буй дэлгэц алга. 3 минутын дотор холбогдсон дэлгэц тоглуулна.",
    "Sent, but no display is listening right now. A display that connects within 3 minutes will play it.",
    "已发送，但目前没有屏幕在收听。3 分钟内连接的屏幕会播放。"
  ],
  "intercom.cancelled": [
    "Цуцаллаа. Юу ч илгээгээгүй.",
    "Cancelled. Nothing was sent.",
    "已取消，未发送任何内容。"
  ],
  "intercom.tooShort": [
    "Хэт богино байна. Дахин товчийг дарж ярина уу.",
    "Too short. Press the button again and speak.",
    "时间太短，请再次点按按钮并讲话。"
  ],
  "intercom.limit": [
    "Дээд хугацаа (2 минут) дууслаа. Илгээж байна…",
    "The 2-minute limit was reached. Sending…",
    "已达到 2 分钟上限，正在发送…"
  ],
  "intercom.timeout": [
    "Илгээх хугацаа хэтэрлээ. Холболтоо шалгаад дахин оролдоно уу.",
    "Sending timed out. Check the connection and try again.",
    "发送超时，请检查网络后重试。"
  ],
  "intercom.sendFailed": [
    "Илгээж чадсангүй.",
    "Could not send.",
    "无法发送。"
  ],
  "intercom.recorderFailed": [
    "Бичлэг амжилтгүй боллоо. Дахин оролдоно уу.",
    "Recording failed. Please try again.",
    "录音失败，请重试。"
  ],
  "intercom.insecure": [
    "Микрофон зөвхөн HTTPS холболтоор ажиллана.",
    "The microphone only works over HTTPS.",
    "麦克风仅在 HTTPS 连接下可用。"
  ],
  "intercom.unsupported": [
    "Энэ хөтөч дуу бичихийг дэмжихгүй байна. Chrome эсвэл Safari-ийн шинэ хувилбар ашиглана уу.",
    "This browser cannot record audio. Use a current Chrome or Safari.",
    "此浏览器不支持录音，请使用较新的 Chrome 或 Safari。"
  ],
  "intercom.micDenied": [
    "Микрофоны зөвшөөрөл олгогдсонгүй. Хөтчийн хаягийн мөрөөс микрофоныг зөвшөөрч дахин оролдоно уу.",
    "Microphone permission was not granted. Allow the microphone in the browser's address bar and try again.",
    "未授予麦克风权限。请在浏览器地址栏中允许麦克风后重试。"
  ],
  "intercom.micMissing": [
    "Микрофон олдсонгүй.",
    "No microphone was found.",
    "未找到麦克风。"
  ],
  "intercom.micBusy": [
    "Микрофоныг өөр програм ашиглаж байна.",
    "Another app is using the microphone.",
    "麦克风正被其他应用占用。"
  ],
  "intercom.micFailed": [
    "Микрофоныг нээж чадсангүй.",
    "Could not open the microphone.",
    "无法打开麦克风。"
  ],
  "language.switch": [
    "Хэл солих: English",
    "Switch language: 中文",
    "切换语言：Монгол"
  ],
  "nav.schedule": [
    "Хуваарь",
    "Schedule",
    "课程表"
  ],
  "nav.clubs": [
    "Дугуйлан",
    "Clubs",
    "社团"
  ],
  "nav.album": [
    "Цомог",
    "Album",
    "相册"
  ],
  "nav.folders": [
    "Хавтас",
    "Folders",
    "文件夹"
  ],
  "nav.textbooks": [
    "СУРАХ БИЧИГ",
    "TEXTBOOKS",
    "教科书"
  ],
  "nav.doodle": [
    "Дурсамжийн самбар",
    "Memory Board",
    "回忆板"
  ],
  "nav.board": [
    "САМБАР",
    "Whiteboard",
    "白板"
  ],
  "nav.music": [
    "Music",
    "Music",
    "音乐"
  ],
  "nav.photobooth": [
    "Photobooth",
    "Photobooth",
    "拍照亭"
  ],
  "nav.aiChat": [
    "AI CHAT",
    "AI CHAT",
    "AI 聊天"
  ],
  "nav.teachermirror": [
    "Дэлгэц Хуваалцах",
    "Screen sharing",
    "屏幕共享"
  ],
  "nav.menu": [
    "Цэс",
    "Menu",
    "菜单"
  ],
  "nav.openMenu": [
    "Цэс нээх",
    "Open menu",
    "打开菜单"
  ],
  "nav.close": [
    "Цэс хаах",
    "Close menu",
    "关闭菜单"
  ],
  "nav.sections": [
    "Ангийн хэрэгслүүд",
    "Class tools",
    "班级工具"
  ],
  "nav.subtitle": [
    "Суралцах, бүтээх, хамтдаа байх.",
    "Learn, create, be together.",
    "学习、创造、相伴。"
  ],
  "nav.currentSection": [
    "Одоогийн хэсэг",
    "Current section",
    "当前栏目"
  ],
  "nav.class": [
    "анги",
    "class",
    "班"
  ],
  "nav.addPhoto": [
    "Зураг нэмэх",
    "Add photos",
    "添加照片"
  ],
  "nav.admin": [
    "Удирдлага",
    "Administration",
    "管理"
  ],
  "brand.tagline": [
    "Суралцах. Бүтээх. Дурсах.",
    "Learn. Create. Remember.",
    "学习。创造。留念。"
  ],
  "schedule.greetingMorning": [
    "Өглөөний мэнд, {className}!",
    "Good morning, {className}!",
    "早上好，{className}！"
  ],
  "schedule.greetingAfternoon": [
    "Өдрийн мэнд, {className}!",
    "Good afternoon, {className}!",
    "下午好，{className}！"
  ],
  "schedule.greetingEvening": [
    "Оройн мэнд, {className}!",
    "Good evening, {className}!",
    "晚上好，{className}！"
  ],
  "schedule.weekLessons": [
    "7 хоногт {count} цаг",
    "{count} periods this week",
    "本周 {count} 节课"
  ],
  "schedule.todayLessons": [
    "Өнөөдөр {count} цаг",
    "{count} periods today",
    "今天 {count} 节课"
  ],
  "schedule.noSchedule": [
    "Хуваарь оруулаагүй",
    "No timetable added",
    "尚未添加课程表"
  ],
  "schedule.noLessonsToday": [
    "Өнөөдөр хичээлгүй",
    "No classes today",
    "今天没有课程"
  ],
  "schedule.subtitle": [
    "{className} анги болон {grade}-р ангийн нийтлэг хичээлүүд",
    "{className} and shared Grade {grade} lessons",
    "{className} 班及 {grade} 年级公共课程"
  ],
  "schedule.subtitleGeneral": [
    "{className} анги болон түвшний нийтлэг хичээлүүд",
    "{className} and shared level lessons",
    "{className} 班及分层公共课程"
  ],
  "schedule.updated": [
    "Шинэчилсэн: {date}",
    "Updated: {date}",
    "更新时间：{date}"
  ],
  "schedule.minutesUntil": [
    "{count} минутын дараа",
    "In {count} minutes",
    "{count} 分钟后"
  ],
  "schedule.hoursUntil": [
    "{hours} цаг {minutes} минутын дараа",
    "In {hours} hours {minutes} minutes",
    "{hours} 小时 {minutes} 分钟后"
  ],
  "schedule.wholeHoursUntil": [
    "{hours} цагийн дараа",
    "In {hours} hours",
    "{hours} 小时后"
  ],
  "schedule.todayDay": [
    "Өнөөдөр · {day}",
    "Today · {day}",
    "今天 · {day}"
  ],
  "schedule.nextDay": [
    "Дараагийн хичээл · {day}",
    "Next lesson · {day}",
    "下一节课 · {day}"
  ],
  "schedule.remaining": [
    "{count} минут үлдсэн",
    "{count} minutes remaining",
    "还剩 {count} 分钟"
  ],
  "schedule.startsAt": [
    "{time}-д эхэлнэ",
    "Starts at {time}",
    "{time} 开始"
  ],
  "schedule.period": [
    "{number}-р цаг",
    "Period {number}",
    "第 {number} 节课"
  ],
  "schedule.groupCount": [
    "{count} бүлэг",
    "{count} groups",
    "{count} 个组"
  ],
  "schedule.room": [
    "{room} тоот",
    "Room {room}",
    "{room} 教室"
  ],
  "schedule.span": [
    "{count} цаг",
    "{count} periods",
    "{count} 节课"
  ],
  "schedule.minuteShort": [
    "мин",
    "min",
    "分钟"
  ],
  "schedule.secondShort": [
    "сек",
    "sec",
    "秒"
  ],
  "schedule.hoursShort": [
    "цаг",
    "hr",
    "小时"
  ],
  "auth.teacherTitle": [
    "Багш нэвтрэх",
    "Teacher sign in",
    "教师登录"
  ],
  "auth.teacherMessage": [
    "Дэлгэцээ ангитай хуваалцахын тулд удирдлагын нууц үгээ оруулна уу.",
    "Enter the administrator password to share your screen with the class.",
    "输入管理员密码，与班级共享屏幕。"
  ],
  "count.selected": [
    "{count} сонгосон",
    "{count} selected",
    "已选择 {count} 项"
  ],
  "count.songs": [
    "{count} дуу",
    "{count} songs",
    "{count} 首歌曲"
  ],
  "count.songsFound": [
    "{count} дуу олдлоо.",
    "{count} songs found.",
    "找到 {count} 首歌曲。"
  ],
  "count.memories": [
    "{count} дурсамж",
    "{count} memories",
    "{count} 段回忆"
  ],
  "count.pages": [
    "{count} хуудас",
    "{count} pages",
    "{count} 页"
  ],
  "count.files": [
    "{count} файл",
    "{count} files",
    "{count} 个文件"
  ],
  "count.messages": [
    "{count} зурвас",
    "{count} messages",
    "{count} 条消息"
  ],
  "count.minutes": [
    "{count} минут",
    "{count} minutes",
    "{count} 分钟"
  ],
  "count.minuteShort": [
    "{count} мин",
    "{count} min",
    "{count} 分钟"
  ],
  "count.books": [
    "{count} ном",
    "{count} books",
    "{count} 本书"
  ],
  "count.booksTotal": [
    "{count} / {total} ном",
    "{count} / {total} books",
    "{count}／{total} 本书"
  ],
  "count.clubsMinutes": [
    "{count} дугуйлан · {minutes} минут",
    "{count} clubs · {minutes} minutes",
    "{count} 个社团 · {minutes} 分钟"
  ],
  "count.sessionsMinutes": [
    "{count} удаа · {minutes} минут",
    "{count} sessions · {minutes} minutes",
    "{count} 次活动 · {minutes} 分钟"
  ],
  "count.remainingMinutes": [
    "Нийт {count} мин үлдлээ",
    "{count} minutes left",
    "还剩 {count} 分钟"
  ],
  "count.minutesSeconds": [
    "{minutes} мин {seconds} сек",
    "{minutes} min {seconds} sec",
    "{minutes} 分 {seconds} 秒"
  ],
  "ui.colorValue": [
    "Өнгө {color}",
    "Color {color}",
    "颜色 {color}"
  ],
  "error.serverStatus": [
    "Серверийн алдаа ({status})",
    "Server error ({status})",
    "服务器错误（{status}）"
  ],
  "camera.watchers": [
    "Шууд · багш холбогдсон: {count}",
    "Live · teachers connected: {count}",
    "实时 · 已连接教师：{count}"
  ],
  "mirror.kicker": [
    "12-2 / ХАМТДАА ҮЗЬЕ",
    "12-2 / WATCH TOGETHER",
    "12-2／一起观看"
  ],
  "mirror.title": [
    "Дэлгэц хуваалцах.",
    "Share your screen.",
    "共享屏幕。"
  ],
  "mirror.intro": [
    "Багшийн дэлгэцийг ангид шууд үзүүлнэ. Холбоосоо том дэлгэц дээр нээгээд энэ хэсэгт хүлээгээрэй.",
    "Show the teacher's screen live to the class. Open this section on the classroom display and wait here.",
    "向班级实时展示教师屏幕。在教室大屏幕上打开此栏目并等待。"
  ],
  "mirror.mode": [
    "Дэлгэцийн горим",
    "Display mode",
    "屏幕模式"
  ],
  "mirror.boardMode": [
    "Ангийн дэлгэц",
    "Classroom display",
    "教室屏幕"
  ],
  "mirror.teacherMode": [
    "Багш",
    "Teacher",
    "教师"
  ],
  "mirror.boardKicker": [
    "ТОМ ДЭЛГЭЦ",
    "CLASSROOM DISPLAY",
    "教室大屏幕"
  ],
  "mirror.waitingTitle": [
    "Багшийн дэлгэцийг хүлээж байна",
    "Waiting for the teacher's screen",
    "正在等待教师屏幕"
  ],
  "mirror.waiting": [
    "Хүлээж байна",
    "Waiting",
    "等待中"
  ],
  "mirror.videoLabel": [
    "Багшийн шууд дэлгэц",
    "Teacher's live screen",
    "教师实时屏幕"
  ],
  "mirror.waitingHint": [
    "Багш хуваалцаж эхлэхэд автоматаар холбогдоно.",
    "Connects automatically when the teacher starts sharing.",
    "教师开始共享后将自动连接。"
  ],
  "mirror.boardHelp": [
    "Энэ хэсгийг нээлттэй байлгаарай.",
    "Keep this section open.",
    "请保持此栏目打开。"
  ],
  "mirror.waitingMessage": [
    "Шууд холболтыг хүлээж байна.",
    "Waiting for a live connection.",
    "正在等待实时连接。"
  ],
  "mirror.listen": [
    "Дууг сонсох",
    "Enable audio",
    "开启声音"
  ],
  "mirror.mute": [
    "Дууг хаах",
    "Mute audio",
    "静音"
  ],
  "mirror.fullscreen": [
    "Бүтэн дэлгэц",
    "Fullscreen",
    "全屏"
  ],
  "mirror.teacherKicker": [
    "БАГШИЙН ТӨХӨӨРӨМЖ",
    "TEACHER'S DEVICE",
    "教师设备"
  ],
  "mirror.teacherTitle": [
    "Хичээлээ том дэлгэцэд.",
    "Your lesson on the big screen.",
    "在大屏幕上展示课程。"
  ],
  "mirror.loginHelp": [
    "Дэлгэц хуваалцахын тулд сайтын админ нууц үгээр нэвтэрнэ.",
    "Sign in with the site administrator password to share your screen.",
    "使用网站管理员密码登录以共享屏幕。"
  ],
  "mirror.login": [
    "Багшаар нэвтрэх",
    "Teacher sign in",
    "教师登录"
  ],
  "mirror.label": [
    "Багш / хичээлийн нэр",
    "Teacher / lesson name",
    "教师／课程名称"
  ],
  "mirror.labelPlaceholder": [
    "12-2 · Багшийн дэлгэц",
    "12-2 · Teacher's screen",
    "12-2 · 教师屏幕"
  ],
  "mirror.source": [
    "Хуваалцах зүйл",
    "Share source",
    "共享内容"
  ],
  "mirror.screen": [
    "Дэлгэц / цонх / Chrome таб",
    "Screen / window / Chrome tab",
    "屏幕／窗口／Chrome 标签页"
  ],
  "mirror.camera": [
    "Камер · утаснаас үзүүлэх",
    "Camera · show from your phone",
    "相机 · 从手机展示"
  ],
  "mirror.quality": [
    "Дүрсний тохиргоо",
    "Video settings",
    "画面设置"
  ],
  "mirror.textQuality": [
    "Текст, слайд · тод дүрс",
    "Text and slides · sharp picture",
    "文字与幻灯片 · 清晰画面"
  ],
  "mirror.motionQuality": [
    "Видео, хөдөлгөөн · жигд дүрс",
    "Video and motion · smooth picture",
    "视频与动态 · 流畅画面"
  ],
  "mirror.shareAudio": [
    "Дууг хамт хуваалцах",
    "Share audio too",
    "同时共享声音"
  ],
  "mirror.screenHelp": [
    "«Эхлэх» дараад хуваалцах дэлгэц, цонх эсвэл табаа сонгоно. Дуу хуваалцах боломж нь төхөөрөмж болон сонгосон эх үүсвэрээс хамаарна.",
    "Choose Start and select your screen, window or tab. Audio sharing depends on your device and selected source.",
    "点击“开始”，选择屏幕、窗口或标签页。声音共享功能取决于设备及所选内容。"
  ],
  "mirror.start": [
    "Хуваалцаж эхлэх",
    "Start sharing",
    "开始共享"
  ],
  "mirror.stop": [
    "Зогсоох",
    "Stop",
    "停止"
  ],
  "mirror.ready": [
    "Хуваалцахдаа зөвхөн үзүүлэх зүйлээ сонгоорой.",
    "Select only what you want the class to see.",
    "请只选择希望班级看到的内容。"
  ],
  "mirror.previewLabel": [
    "Таны хуваалцаж буй дүрс",
    "Your shared video",
    "你共享的画面"
  ],
  "mirror.privacy": [
    "Зөвхөн шууд дамжуулна. Бичлэг хадгалахгүй. Сайтын бусад хэсэгт орсон ч хуваалцалт үргэлжилнэ; «Зогсоох» эсвэл хөтчийн хуваалцахыг зогсоох товчоор дуусгана.",
    "Live sharing only; nothing is recorded. Sharing continues in other sections. End it with Stop or your browser's stop-sharing button.",
    "仅实时共享，不保存录像。进入其他栏目后仍会继续共享。点击“停止”或浏览器的停止共享按钮结束。"
  ],
  "mirror.networkError": [
    "Холболт түр тасарлаа.",
    "The connection was interrupted.",
    "连接暂时中断。"
  ],
  "mirror.timeout": [
    "Холболт удааширлаа. Дахин холбогдож байна.",
    "Connection is slow. Reconnecting.",
    "连接较慢，正在重新连接。"
  ],
  "mirror.sharingLive": [
    "LIVE · Дэлгэц хуваалцаж байна",
    "LIVE · Sharing your screen",
    "实时 · 正在共享屏幕"
  ],
  "mirror.starting": [
    "Хуваалцахыг эхлүүлж байна",
    "Starting screen sharing",
    "正在启动屏幕共享"
  ],
  "mirror.sharingDetail": [
    "{name} · {count} дэлгэц холбогдсон",
    "{name} · {count} displays connected",
    "{name} · 已连接 {count} 个屏幕"
  ],
  "mirror.defaultLabel": [
    "12-2 · Багшийн дэлгэц",
    "12-2 · Teacher's screen",
    "12-2 · 教师屏幕"
  ],
  "mirror.pickerWaiting": [
    "Хөтчийн сонголтыг хүлээж байна",
    "Waiting for browser selection",
    "等待浏览器选择"
  ],
  "mirror.connecting": [
    "Холбогдож байна",
    "Connecting",
    "正在连接"
  ],
  "mirror.connectingHint": [
    "Багшийн дүрстэй холбогдож байна…",
    "Connecting to the teacher's video…",
    "正在连接教师画面…"
  ],
  "mirror.cameraHelp": [
    "Утасны камерыг сонгож шууд үзүүлнэ. Энэ нь утасны бүтэн дэлгэцийг хуваалцахгүй. Дууг сонгосон үед микрофоны зөвшөөрөл асууна.",
    "Share your phone's camera live. This does not share the phone's entire screen. Enabling audio asks for microphone permission.",
    "实时展示手机相机画面，不会共享整个手机屏幕。开启声音时会请求麦克风权限。"
  ],
  "mirror.boardReconnecting": [
    "Холболтыг сэргээж байна.",
    "Reconnecting.",
    "正在恢复连接。"
  ],
  "mirror.viewing": [
    "{name} · Шууд үзэж байна.",
    "{name} · Watching live.",
    "{name} · 正在实时观看。"
  ],
  "mirror.unsupported": [
    "HTTPS болон WebRTC дэмждэг хөтчөөр нээнэ үү.",
    "Open in a browser that supports HTTPS and WebRTC.",
    "请使用支持 HTTPS 和 WebRTC 的浏览器打开。"
  ],
  "mirror.localPreview": [
    "Таны хуваалцаж буй дүрс. Дуу давхар тоглуулахгүй.",
    "Your shared video. Audio will not play twice.",
    "你共享的画面。声音不会重复播放。"
  ],
  "mirror.connectingMessage": [
    "Багшийн дүрсийг ачаалж байна.",
    "Loading the teacher's video.",
    "正在加载教师画面。"
  ],
  "mirror.viewerLimit": [
    "Одоогоор 8 дэлгэц холбогдсон байна. Сулрахад автоматаар холбогдоно.",
    "Eight displays are connected. You will connect automatically when a slot opens.",
    "目前已连接八个屏幕。有空位后将自动连接。"
  ],
  "mirror.stopped": [
    "Хуваалцалт дууслаа. Дахин эхлэхдээ үзүүлэх зүйлээ шинээр сонгоно.",
    "Sharing ended. Select a source again to restart.",
    "共享已结束。重新开始时请再次选择共享内容。"
  ],
  "mirror.authLost": [
    "Багшийн нэвтрэлт эсвэл дамжуулалтын эрх дууслаа. Дахин нэвтэрч эхлүүлнэ үү.",
    "Teacher sign-in or sharing permission expired. Sign in again to restart.",
    "教师登录或共享权限已过期。请重新登录后开始。"
  ],
  "mirror.teacherReconnecting": [
    "Шууд дүрс хэвээр байна. Сүлжээний холболтыг сэргээж байна.",
    "The live video continues. Reconnecting the network.",
    "实时画面仍在继续。正在恢复网络连接。"
  ],
  "mirror.teacherLive": [
    "Хуваалцаж байна · {count} дэлгэц холбогдсон.",
    "Sharing live · {count} displays connected.",
    "正在共享 · 已连接 {count} 个屏幕。"
  ],
  "mirror.roomBusy": [
    "Өөр багш хуваалцаж байна. Дуусахыг хүлээгээд дахин эхлүүлнэ үү.",
    "Another teacher is sharing. Wait until they finish, then try again.",
    "另一位教师正在共享。请等待结束后重试。"
  ],
  "mirror.phoneHelp": [
    "Энэ хөтөч дэлгэц хуваалцахгүй. «Камер» сонголтоор утасны камераас үзүүлж болно.",
    "This browser cannot share its screen. Choose Camera to show your phone's camera.",
    "此浏览器无法共享屏幕。可选择“相机”展示手机相机画面。"
  ],
  "mirror.cameraUnsupported": [
    "Энэ хөтөч камер хуваалцах боломжгүй байна.",
    "This browser cannot share a camera.",
    "此浏览器无法共享相机画面。"
  ],
  "mirror.noVideo": [
    "Хуваалцах дүрс олдсонгүй.",
    "No video source found.",
    "未找到可共享的画面。"
  ],
  "mirror.sourceEnded": [
    "Хөтчийн хуваалцалт дууслаа.",
    "Browser sharing ended.",
    "浏览器共享已结束。"
  ],
  "mirror.loginReady": [
    "Нэвтэрлээ. «Хуваалцаж эхлэх» дарж үзүүлэх зүйлээ сонгоно.",
    "Signed in. Choose Start sharing and select your source.",
    "已登录。点击“开始共享”并选择内容。"
  ],
  "mirror.audioBlocked": [
    "Дуу тоглуулахыг хөтөч зөвшөөрөөгүй. Дахин «Дууг сонсох» дарна уу.",
    "The browser blocked audio. Choose Enable audio again.",
    "浏览器阻止了声音播放。请再次点击“开启声音”。"
  ],
  "mirror.fullscreenBlocked": [
    "Бүтэн дэлгэц нээгдсэнгүй. Хөтчийн бүтэн дэлгэцийн товчийг ашиглаж болно.",
    "Fullscreen did not open. You can use the browser's fullscreen button.",
    "未能打开全屏。可以使用浏览器的全屏按钮。"
  ],
  "mirror.fullscreenUnsupported": [
    "Энэ хөтөч бүтэн дэлгэцийг дэмжихгүй байна.",
    "This browser does not support fullscreen.",
    "此浏览器不支持全屏。"
  ],
  "mirror.captureCancelled": [
    "Хуваалцах сонголтыг цуцалсан эсвэл зөвшөөрөл өгөөгүй байна. Хүсвэл дахин эхлүүлээрэй.",
    "Sharing was cancelled or permission was denied. Start again if you want to share.",
    "共享已取消或未获得权限。如需共享，可以重新开始。"
  ],
  "mirror.captureFailed": [
    "Хуваалцаж чадсангүй. Төхөөрөмж, сүлжээ болон хөтчийн зөвшөөрлийг шалгаад дахин эхлүүлнэ үү.",
    "Could not share. Check your device, network and browser permissions, then try again.",
    "无法共享。请检查设备、网络及浏览器权限后重试。"
  ],
  "mirror.liveNoAudio": [
    "Дүрс хуваалцаж байна. Сонгосон эх үүсвэр дуу өгсөнгүй; шаардлагатай бол дуу хуваалцах боломжтой Chrome таб сонгоорой.",
    "Video is sharing. The source supplied no audio; choose a Chrome tab with audio sharing if needed.",
    "正在共享画面，但所选内容没有声音。如有需要，请选择可共享声音的 Chrome 标签页。"
  ],
  "Original": [
    "Эх зураг",
    "Original",
    "原图"
  ],
  "90’s": [
    "90-ээд он",
    "90’s",
    "九十年代"
  ],
  "Portra": [
    "Портра",
    "Portra",
    "胶片人像"
  ],
  "Golden Hour": [
    "Алтан цаг",
    "Golden Hour",
    "黄金时刻"
  ],
  "Green Film": [
    "Ногоон плёнк",
    "Green Film",
    "绿色胶片"
  ],
  "Faded": [
    "Бүдгэрсэн",
    "Faded",
    "褪色"
  ],
  "Instant": [
    "Шууд зураг",
    "Instant",
    "拍立得"
  ],
  "Grain Club": [
    "Плёнкны ширхэг",
    "Grain Club",
    "胶片颗粒"
  ],
  "Amber": [
    "Хув шар",
    "Amber",
    "琥珀色"
  ],
  "Glow": [
    "Гялбаа",
    "Glow",
    "光晕"
  ],
  "Rose": [
    "Сарнай",
    "Rose",
    "玫瑰"
  ],
  "Peach": [
    "Тоорын өнгө",
    "Peach",
    "蜜桃色"
  ],
  "Cream": [
    "Крем",
    "Cream",
    "奶油色"
  ],
  "Soft Light": [
    "Зөөлөн гэрэл",
    "Soft Light",
    "柔光"
  ],
  "Honey": [
    "Зөгийн бал",
    "Honey",
    "蜂蜜色"
  ],
  "Dream": [
    "Зүүд",
    "Dream",
    "梦境"
  ],
  "Blush": [
    "Ягаан хацар",
    "Blush",
    "腮红"
  ],
  "Blue Hour": [
    "Хөх цаг",
    "Blue Hour",
    "蓝色时刻"
  ],
  "Ice": [
    "Мөс",
    "Ice",
    "冰色"
  ],
  "Mint": [
    "Гааны өнгө",
    "Mint",
    "薄荷色"
  ],
  "Lavender": [
    "Лаванда",
    "Lavender",
    "薰衣草"
  ],
  "Moonlight": [
    "Сарны гэрэл",
    "Moonlight",
    "月光"
  ],
  "Teal Club": [
    "Хөх ногоон",
    "Teal Club",
    "青绿色"
  ],
  "B&W": [
    "Хар цагаан",
    "B&W",
    "黑白"
  ],
  "Silver": [
    "Мөнгөлөг",
    "Silver",
    "银色"
  ],
  "Ink": [
    "Бэх",
    "Ink",
    "墨色"
  ],
  "Noir": [
    "Харанхуй плёнк",
    "Noir",
    "黑色电影"
  ],
  "Sepia": [
    "Бор шар",
    "Sepia",
    "棕褐色"
  ],
  "Charcoal": [
    "Нүүрсний өнгө",
    "Charcoal",
    "炭灰色"
  ],
  "Pop": [
    "Тод өнгө",
    "Pop",
    "鲜艳"
  ],
  "Candy": [
    "Чихэр",
    "Candy",
    "糖果色"
  ],
  "Disco": [
    "Диско",
    "Disco",
    "迪斯科"
  ],
  "Sunset": [
    "Нар жаргах",
    "Sunset",
    "日落"
  ],
  "Electric": [
    "Цахилгаан өнгө",
    "Electric",
    "电光"
  ],
  "Duotone": [
    "Хос өнгө",
    "Duotone",
    "双色"
  ],
  "Comic": [
    "Комик",
    "Comic",
    "漫画"
  ],
  "Love note": [
    "Хайрын зурвас",
    "Love note",
    "情书"
  ],
  "Cherry": [
    "Интоор",
    "Cherry",
    "樱桃"
  ],
  "Ribbon": [
    "Тууз",
    "Ribbon",
    "蝴蝶结"
  ],
  "Washi tape": [
    "Чимэглэлийн тууз",
    "Washi tape",
    "和纸胶带"
  ],
  "Party": [
    "Баяр",
    "Party",
    "派对"
  ],
  "Disco ball": [
    "Диско бөмбөлөг",
    "Disco ball",
    "迪斯科球"
  ],
  "Confetti": [
    "Конфетти",
    "Confetti",
    "彩纸"
  ],
  "Alien": [
    "Харь гаригийнхан",
    "Alien",
    "外星人"
  ],
  "Fire": [
    "Гал",
    "Fire",
    "火焰"
  ],
  "Cool": [
    "Гоё",
    "Cool",
    "酷"
  ],
  "Glitter": [
    "Гялтгануур",
    "Glitter",
    "亮片"
  ],
  "SENIOR": [
    "ТӨГСӨГЧ",
    "SENIOR",
    "毕业生"
  ],
  "Good vibes": [
    "Сайхан мэдрэмж",
    "Good vibes",
    "美好氛围"
  ],
  "Besties": [
    "Дотны найзууд",
    "Besties",
    "好朋友"
  ],
  "Forever": [
    "Үүрд",
    "Forever",
    "永远"
  ],
  "Our days": [
    "Бидний өдрүүд",
    "Our days",
    "我们的日子"
  ],
  "Be you": [
    "Өөрөөрөө бай",
    "Be you",
    "做自己"
  ],
  "No stress": [
    "Стрессгүй",
    "No stress",
    "无压力"
  ],
  "Smile!": [
    "Инээмсэглэ!",
    "Smile!",
    "笑一个！"
  ],
  "We made it": [
    "Бид чадлаа",
    "We made it",
    "我们做到了"
  ],
  "Panda": [
    "Панда",
    "Panda",
    "熊猫"
  ],
  "Unicorn": [
    "Ганц эвэрт",
    "Unicorn",
    "独角兽"
  ],
  "Cool shades": [
    "Нарны шил",
    "Cool shades",
    "酷炫墨镜"
  ],
  "Heart eyes": [
    "Зүрхэн нүд",
    "Heart eyes",
    "爱心眼睛"
  ],
  "Cat ears": [
    "Муурын чих",
    "Cat ears",
    "猫耳朵"
  ],
  "Bunny ears": [
    "Туулайн чих",
    "Bunny ears",
    "兔耳朵"
  ],
  "Royal": [
    "Хааны титэм",
    "Royal",
    "皇家皇冠"
  ],
  "Flower crown": [
    "Цэцгэн титэм",
    "Flower crown",
    "花冠"
  ],
  "Freckles": [
    "Сэвх",
    "Freckles",
    "雀斑"
  ],
  "Rainbow cheeks": [
    "Солонгон хацар",
    "Rainbow cheeks",
    "彩虹脸颊"
  ],
  "Moustache": [
    "Сахал",
    "Moustache",
    "胡子"
  ],
  "Star cheeks": [
    "Одтой хацар",
    "Star cheeks",
    "星星脸颊"
  ],
  "Alien antenna": [
    "Антенн",
    "Alien antenna",
    "外星天线"
  ],
  "Angel halo": [
    "Гэрлэн титэм",
    "Angel halo",
    "天使光环"
  ],
  "OUR LAST YEAR, OUR OWN WALL": [
    "БИДНИЙ СҮҮЛИЙН ЖИЛ, БИДНИЙ САМБАР",
    "OUR LAST YEAR, OUR OWN WALL",
    "我们的最后一年，我们的回忆墙"
  ],
  "THE CLASS OF 12–2 / MEMORY BOOK": [
    "12–2 АНГИ / ДУРСАМЖИЙН ДЭВТЭР",
    "THE CLASS OF 12–2 / MEMORY BOOK",
    "12–2 班／回忆册"
  ],
  "12–2 · A LITTLE HELP, EVERY DAY": [
    "12–2 · ӨДӨР БҮР БАГАХАН ТУСЛАМЖ",
    "12–2 · A LITTLE HELP, EVERY DAY",
    "12–2 · 每天一点帮助"
  ],
  "YOUR PHOTO STRIP": [
    "ЧИНИЙ ЗУРГИЙН ХУУДАС",
    "YOUR PHOTO STRIP",
    "你的照片条"
  ],
  "THE MEMORY WALL": [
    "ДУРСАМЖИЙН ХАНА",
    "THE MEMORY WALL",
    "回忆墙"
  ],
  "mirror.balancedQuality": [
    "Хөнгөн · 720p / 15 FPS",
    "Light · 720p / 15 FPS",
    "轻量 · 720p / 15 帧"
  ],
  "mirror.lowQuality": [
    "Хамгийн хөнгөн · 480p / 12 FPS",
    "Very light · 480p / 12 FPS",
    "极轻量 · 480p / 12 帧"
  ],
  "mirror.sharpQuality": [
    "Тод текст · 1080p / 24 FPS",
    "Clear text · 1080p / 24 FPS",
    "清晰文字 · 1080p / 24 帧"
  ],
  "mirror.playPrompt": [
    "Дүрсийг тоглуулахын тулд нэг удаа дарна уу.",
    "Press once to play the video.",
    "点击一次以播放画面。"
  ],
  "mirror.playVideo": [
    "Дүрсийг тоглуулах",
    "Play video",
    "播放画面"
  ],
  "mirror.retry": [
    "Дахин холбох",
    "Reconnect",
    "重新连接"
  ],
  "mirror.playRequired": [
    "Тоглуулахыг хүлээж байна",
    "Waiting for playback",
    "等待播放"
  ],
  "mirror.transportConnected": [
    "Холбогдсон",
    "Connected",
    "已连接"
  ],
  "mirror.transportInterrupted": [
    "Тасарсан",
    "Disconnected",
    "已断开"
  ],
  "mirror.videoDiagnostics": [
    "{width}×{height} · {fps} FPS",
    "{width}×{height} · {fps} FPS",
    "{width}×{height} · {fps} 帧/秒"
  ],
  "mirror.connectionDiagnostics": [
    "{state} · Видео {kb} KB · {frames} кадр",
    "{state} · Video {kb} KB · {frames} frames",
    "{state} · 视频 {kb} KB · {frames} 帧"
  ],
  "mirror.autoplayBlocked": [
    "Хөтөч автоматаар тоглуулахыг зөвшөөрөөгүй. «Дүрсийг тоглуулах» товчийг нэг удаа дарна уу.",
    "Your browser blocked autoplay. Press Play video once.",
    "浏览器阻止了自动播放。请点击一次“播放画面”。"
  ],
  "mirror.playbackFailed": [
    "Дүрс тоглуулахад алдаа гарлаа. «Дахин холбох» дарж оролдоно уу.",
    "Video playback failed. Press Reconnect to try again.",
    "画面播放失败。请点击“重新连接”再试。"
  ],
  "mirror.decodeWaiting": [
    "Дүрсний өгөгдөл ирсэн ч зураг хараахан тайлагдаагүй байна. Багшийн төхөөрөмж дээр 480p тохиргоо сонгож дахин эхлүүлж болно.",
    "Video data arrived but the picture has not decoded. The teacher can select 480p and restart sharing.",
    "视频数据已到达，但画面尚未解码。教师可选择 480p 并重新开始共享。"
  ],
  "mirror.networkBlocked": [
    "Wi-Fi төхөөрөмжүүдийн дүрсний холболтыг хааж байж болно. Холболтыг сэргээж байна; үргэлжилбэл сайтын эзнээр дамжуулах серверийн тохиргоог шалгуулна уу.",
    "Wi-Fi may be blocking video between devices. Reconnecting; if this continues, ask the site owner to check the relay server.",
    "Wi-Fi 可能阻止了设备之间的视频连接。正在重新连接；若持续出现，请联系网站管理员检查中继服务器。"
  ],
  "mirror.framesWaiting": [
    "Багшийн нэр ирсэн боловч дүрсний кадр хараахан ирсэнгүй. Холболтыг сэргээж байна.",
    "The teacher name arrived, but no video frame has arrived yet. Reconnecting.",
    "已收到教师名称，但尚未收到视频画面。正在恢复连接。"
  ],
  "mirror.videoStalled": [
    "Дүрс түр зогслоо. Шинээр холбогдож байна.",
    "Video stopped arriving. Starting a fresh connection.",
    "画面暂时停止。正在建立新连接。"
  ],
  "mirror.framesLoading": [
    "Дүрсний холболт ирлээ. Эхний кадрыг хүлээж байна.",
    "Video connection received. Waiting for the first frame.",
    "已建立视频连接。正在等待第一帧画面。"
  ],
  "mirror.sourceInterrupted": [
    "Багшийн дүрс тасарлаа. Шинээр холбогдож байна.",
    "The teacher video was interrupted. Reconnecting.",
    "教师画面已中断。正在重新连接。"
  ],
  "mirror.connectionFailed": [
    "Дүрсний холболт байгуулагдсангүй. Шинээр холбогдож байна.",
    "The video connection could not be established. Reconnecting.",
    "无法建立视频连接。正在重新连接。"
  ],
  "mirror.negotiationFailed": [
    "Хөтчүүд дүрсний форматаа тохиролцож чадсангүй. Шинээр холбогдож байна.",
    "The browsers could not agree on a video format. Reconnecting.",
    "浏览器无法协商视频格式。正在重新连接。"
  ],
  "mirror.decodeFailed": [
    "Хөтөч дүрсийг тоглуулж чадсангүй. Шинээр холбогдож байна.",
    "The browser could not play the video. Reconnecting.",
    "浏览器无法播放画面。正在重新连接。"
  ],
  "call.active": [
    "Самбартай холбогдлоо. Ярьж болно.",
    "Connected to the board. You can talk.",
    "已与大屏连接，可以通话。"
  ],
  "call.announceBusy": [
    "Зарлал бичиж байна. Эхлээд түүнийг дуусгана уу.",
    "You are recording an announcement. Finish it first.",
    "您正在录制通知，请先完成。"
  ],
  "call.boardsChecking": [
    "Самбарын төлөвийг шалгаж байна…",
    "Checking boards…",
    "正在检查大屏状态…"
  ],
  "call.boardsCount": [
    "{count} самбар холбогдсон",
    "{count} board(s) connected",
    "已连接 {count} 个大屏"
  ],
  "call.boardsHint": [
    "Самбар дээр сайтыг нээж «Intercom сонсох» товчийг дарна уу.",
    "Open the site on the board and tap “Listen to Intercom”.",
    "请在大屏上打开网站并点按“收听广播”。"
  ],
  "call.boardsNoMic": [
    " · {count} самбарт микрофон зөвшөөрөөгүй",
    " · {count} without microphone permission",
    " · {count} 个未授权麦克风"
  ],
  "call.boardsNone": [
    "Холбогдсон самбар алга",
    "No board connected",
    "没有已连接的大屏"
  ],
  "call.cancel": [
    "Цуцлах",
    "Cancel",
    "取消"
  ],
  "call.cardSub": [
    "Самбар хонх дуугаргаж, өөрөө хүлээн авсны дараа та хоёр шууд ярилцана.",
    "The board rings, picks up by itself, and then you talk live.",
    "大屏会响铃并自动接听，随后您就可以直接通话。"
  ],
  "call.cardTitle": [
    "Самбар руу дуудлага",
    "Call the board",
    "呼叫教室大屏"
  ],
  "call.connecting": [
    "Холбогдож байна…",
    "Connecting…",
    "正在连接…"
  ],
  "call.end.board": [
    "Самбар дуудлагыг таслалаа.",
    "The board hung up.",
    "大屏已挂断。"
  ],
  "call.end.cancelled": [
    "Дуудлагыг цуцаллаа.",
    "Call cancelled.",
    "通话已取消。"
  ],
  "call.end.declined": [
    "Самбар дуудлагаас татгалзлаа.",
    "The board declined the call.",
    "大屏拒绝了通话。"
  ],
  "call.end.done": [
    "Дуудлага дууслаа.",
    "Call ended.",
    "通话已结束。"
  ],
  "call.end.failed": [
    "Холболт тогтоогдсонгүй. Дахин оролдоно уу.",
    "Could not connect. Please try again.",
    "无法建立连接，请重试。"
  ],
  "call.end.failedTurn": [
    "Самбар өөр сүлжээнд байвал TURN сервер (шууд камерын тохиргоотой ижил) шаардлагатай.",
    "If the board is on another network, a TURN server (the same one as live camera) is needed.",
    "如果大屏位于其他网络，则需要 TURN 服务器（与实时摄像头相同的配置）。"
  ],
  "call.end.lost": [
    "Холболт тасарлаа.",
    "The connection was lost.",
    "连接已中断。"
  ],
  "call.end.missed": [
    "Самбар хариулсангүй.",
    "The board did not answer.",
    "大屏没有应答。"
  ],
  "call.end.taken": [
    "Өөр самбар дуудлагад хариулсан.",
    "Another board answered the call.",
    "另一块大屏已接听。"
  ],
  "call.end.timeout": [
    "Дуудлага 30 минутын дээд хугацаандаа хүрч дууслаа.",
    "The call reached the 30 minute limit and ended.",
    "通话已达 30 分钟上限并结束。"
  ],
  "call.errAuth": [
    "Нэвтрэх хугацаа дууссан байж магадгүй. Хуудсаа дахин ачаална уу.",
    "Your login may have expired. Reload the page.",
    "登录可能已过期。请刷新页面。"
  ],
  "call.errBusy": [
    "Өөр дуудлага явагдаж байна. Дуусахыг хүлээнэ үү.",
    "Another call is in progress. Wait for it to finish.",
    "另一通话正在进行，请等待其结束。"
  ],
  "call.errGeneric": [
    "Дуудлага эхлүүлж чадсангүй. Дахин оролдоно уу.",
    "Could not start the call. Please try again.",
    "无法发起通话，请重试。"
  ],
  "call.errInsecure": [
    "Дуудлага зөвхөн HTTPS холболтоор ажиллана.",
    "Calls only work over an HTTPS connection.",
    "通话仅能通过 HTTPS 连接使用。"
  ],
  "call.errNetwork": [
    "Сүлжээний алдаа. Холболтоо шалгаад дахин оролдоно уу.",
    "Network error. Check your connection and try again.",
    "网络错误，请检查网络后重试。"
  ],
  "call.errNoBoard": [
    "Одоогоор холбогдсон самбар алга. Самбар дээр сайтыг нээж «Intercom сонсох» товчийг дарна уу.",
    "No board is connected right now. Open the site on the board and tap “Listen to Intercom”.",
    "当前没有已连接的大屏。请在大屏上打开网站并点按“收听广播”。"
  ],
  "call.errRate": [
    "Хэт олон удаа дуудлаа. Нэг минут хүлээгээд дахин оролдоно уу.",
    "Too many calls. Wait a minute and try again.",
    "呼叫过于频繁，请等待一分钟后重试。"
  ],
  "call.errServer": [
    "Серверийн алдаа. Түр хүлээгээд дахин оролдоно уу.",
    "Server error. Wait a moment and try again.",
    "服务器出错，请稍后重试。"
  ],
  "call.errUnsupported": [
    "Энэ хөтөч дуудлагыг дэмжихгүй байна. Chrome эсвэл Safari-ийн шинэ хувилбар ашиглана уу.",
    "This browser does not support calls. Use a recent Chrome or Safari.",
    "此浏览器不支持通话。请使用较新版本的 Chrome 或 Safari。"
  ],
  "call.hangup": [
    "Таслах",
    "Hang up",
    "挂断"
  ],
  "call.heardLabel": [
    "Самбарын дуу",
    "Board sound",
    "大屏声音"
  ],
  "call.idle": [
    "Бэлэн. ДУУДЛАГА ХИЙХ товчийг дарна уу.",
    "Ready. Press the call button.",
    "准备就绪。请点按“发起通话”按钮。"
  ],
  "call.micLabel": [
    "Таны микрофон",
    "Your microphone",
    "您的麦克风"
  ],
  "call.muteOff": [
    "Микрофон нээх",
    "Unmute microphone",
    "打开麦克风"
  ],
  "call.muteOn": [
    "Микрофон хаах",
    "Mute microphone",
    "关闭麦克风"
  ],
  "call.netWeak": [
    "Холболт тогтворгүй байна…",
    "The connection is unstable…",
    "连接不稳定…"
  ],
  "call.orphan": [
    "Өмнөх дуудлага үргэлжилсээр байна. Таслаад шинээр дуудна уу.",
    "An earlier call is still running. Hang it up, then call again.",
    "上一个通话仍在进行。请先挂断再重新呼叫。"
  ],
  "call.prepare": [
    "Микрофон, холболтыг бэлдэж байна…",
    "Preparing the microphone and connection…",
    "正在准备麦克风和连接…"
  ],
  "call.remoteMuted": [
    "Самбарын микрофон хаалттай байна.",
    "The board's microphone is muted.",
    "大屏的麦克风已静音。"
  ],
  "call.ringing": [
    "Самбар дуугарч байна…",
    "The board is ringing…",
    "大屏正在响铃…"
  ],
  "call.spkOff": [
    "Самбарын дууг хаах",
    "Mute board sound",
    "静音大屏声音"
  ],
  "call.spkOn": [
    "Самбарын дууг нээх",
    "Unmute board sound",
    "取消静音大屏声音"
  ],
  "call.start": [
    "ДУУДЛАГА ХИЙХ",
    "MAKE A CALL",
    "发起通话"
  ],
  "call.unlock": [
    "Самбарын дууг нээх",
    "Turn on board sound",
    "开启大屏声音"
  ],
  "call.youMuted": [
    "Таны микрофон хаалттай байна. Самбар таныг сонсохгүй.",
    "Your microphone is muted. The board cannot hear you.",
    "您的麦克风已静音，大屏听不到您。"
  ],
  "intercom.agoDay": [
    "{count} өдрийн өмнө",
    "{count} d ago",
    "{count} 天前"
  ],
  "intercom.agoHour": [
    "{count} цагийн өмнө",
    "{count} h ago",
    "{count} 小时前"
  ],
  "intercom.agoMin": [
    "{count} мин өмнө",
    "{count} min ago",
    "{count} 分钟前"
  ],
  "intercom.agoNow": [
    "дөнгөж сая",
    "just now",
    "刚刚"
  ],
  "intercom.btnStop": [
    "ЗОГСООХ",
    "STOP",
    "停止"
  ],
  "intercom.callBusy": [
    "Дуудлага явагдаж байна. Эхлээд дуудлагаа дуусгана уу.",
    "A call is in progress. Finish the call first.",
    "正在通话中。请先结束通话。"
  ],
  "intercom.cardSub": [
    "Хөгжим тоглосны дараа таны дуу сонсогдоно.",
    "The chime plays first, then your voice.",
    "先播放提示音，然后播放您的声音。"
  ],
  "intercom.cardTitle": [
    "Зарлал илгээх",
    "Send an announcement",
    "发送广播通知"
  ],
  "intercom.chimeMissing": [
    "Дуудлагын хөгжмийн файл серверээс олдсонгүй тул зарлал хөгжимгүйгээр тоглоно. Администратор assets/audio/music.mp3 файлыг байршуулна уу.",
    "The call chime file was not found on the server, so announcements play without it. The administrator should upload assets/audio/music.mp3.",
    "服务器上找不到提示音文件，通知将不带提示音播放。请管理员上传 assets/audio/music.mp3。"
  ],
  "intercom.discarded": [
    "Бичлэгийг устгалаа. Юу ч илгээгээгүй.",
    "Recording deleted. Nothing was sent.",
    "录音已删除，未发送任何内容。"
  ],
  "intercom.errAuth": [
    "Нэвтрэх хугацаа дууссан байж магадгүй. Хуудсаа дахин ачаална уу.",
    "Your login may have expired. Reload the page.",
    "登录可能已过期。请刷新页面。"
  ],
  "intercom.errGone": [
    "Бичлэг олдсонгүй. Жагсаалтыг шинэчиллээ.",
    "Recording not found. The list was refreshed.",
    "找不到该录音，列表已刷新。"
  ],
  "intercom.errNetwork": [
    "Сүлжээний алдаа. Холболтоо шалгаад дахин оролдоно уу.",
    "Network error. Check your connection and try again.",
    "网络错误，请检查网络后重试。"
  ],
  "intercom.errServer": [
    "Серверийн алдаа. Түр хүлээгээд дахин оролдоно уу.",
    "Server error. Wait a moment and try again.",
    "服务器出错，请稍后重试。"
  ],
  "intercom.errTooLarge": [
    "Бичлэг хэт урт байна.",
    "The recording is too long.",
    "录音太长。"
  ],
  "intercom.errType": [
    "Энэ дууны формат дэмжигдэхгүй байна.",
    "This audio format is not supported.",
    "不支持此音频格式。"
  ],
  "intercom.playAria": [
    "{time} илгээсэн зарлалыг сонсох",
    "Listen to the announcement sent {time}",
    "试听{time}发送的通知"
  ],
  "intercom.previewAll": [
    "Самбар дээр сонсогдох хэлбэрээр сонсох",
    "Preview as the displays will play it",
    "按屏幕播放效果试听"
  ],
  "intercom.previewChime": [
    "Дуудлагын хөгжим тоглож байна…",
    "Playing the call chime…",
    "正在播放提示音…"
  ],
  "intercom.previewNone": [
    "Сонсох бичлэг алга. Эхлээд зарлал бичнэ үү.",
    "Nothing to play yet. Record an announcement first.",
    "还没有可播放的内容。请先录制通知。"
  ],
  "intercom.previewVoice": [
    "Зарлал тоглож байна…",
    "Playing the announcement…",
    "正在播放通知…"
  ],
  "intercom.recordingReview": [
    "Бичиж байна… Ярьж дуусаад ЗОГСООХ товчийг дарж, илгээхээсээ өмнө сонсоно уу.",
    "Recording… When you are done, press STOP and listen before sending.",
    "正在录音… 讲完后点按“停止”，发送前先试听。"
  ],
  "intercom.resend": [
    "Дахин илгээх",
    "Send again",
    "再次发送"
  ],
  "intercom.resendAria": [
    "{time} илгээсэн зарлалыг дахин илгээх",
    "Send the announcement from {time} again",
    "再次发送{time}的通知"
  ],
  "intercom.resendConfirm": [
    "Энэ зарлалыг {count} дэлгэц дээр дахин тоглуулах уу?",
    "Play this announcement again on {count} display(s)?",
    "要在 {count} 个屏幕上再次播放此通知吗？"
  ],
  "intercom.resendConfirmNone": [
    "Одоогоор сонсож буй дэлгэц алга. Дахин илгээвэл 3 минутын дотор холбогдсон дэлгэц тоглуулна. Үргэлжлүүлэх үү?",
    "No display is listening right now. If you send it again, displays that connect within 3 minutes will play it. Continue?",
    "当前没有正在收听的屏幕。再次发送后，3 分钟内连接的屏幕会播放。要继续吗？"
  ],
  "intercom.resendFailed": [
    "Дахин илгээж чадсангүй.",
    "Could not send it again.",
    "无法再次发送。"
  ],
  "intercom.resent": [
    "Дахин илгээгдлээ. {count} дэлгэц сонсож байна.",
    "Sent again. {count} display(s) listening.",
    "已再次发送。{count} 个屏幕正在收听。"
  ],
  "intercom.reviewDiscard": [
    "Устгах",
    "Delete",
    "删除"
  ],
  "intercom.reviewReady": [
    "Бичлэг бэлэн ({time}). Сонсоод илгээнэ үү.",
    "Recording ready ({time}). Listen, then send it.",
    "录音已就绪（{time}）。请试听后再发送。"
  ],
  "intercom.reviewRedo": [
    "Дахин бичих",
    "Record again",
    "重新录制"
  ],
  "intercom.reviewSend": [
    "Илгээх",
    "Send",
    "发送"
  ],
  "intercom.reviewTitle": [
    "Бичлэгээ шалгана уу",
    "Check your recording",
    "请检查录音"
  ],
  "intercom.reviewToggle": [
    "Илгээхээс өмнө сонсож шалгах",
    "Listen before sending",
    "发送前先试听"
  ],
  "intercom.silent": [
    "Микрофоноос дуу сонсогдохгүй байна. Микрофоноо шалгана уу.",
    "No sound from the microphone. Please check it.",
    "麦克风没有声音，请检查麦克风。"
  ],
  "intercom.stopping": [
    "Зогсоож байна…",
    "Stopping…",
    "正在停止…"
  ],
  "call.board.teacher": [
    "Багш",
    "Teacher",
    "老师"
  ],
  "call.board.ringing": [
    "Багш дуудаж байна…",
    "The teacher is calling…",
    "老师正在呼叫…"
  ],
  "call.board.connecting": [
    "Холбогдож байна…",
    "Connecting…",
    "正在连接…"
  ],
  "call.board.talking": [
    "Яриа үргэлжилж байна",
    "Call in progress",
    "通话进行中"
  ],
  "call.board.decline": [
    "Татгалзах",
    "Decline",
    "拒绝"
  ],
  "call.board.hangup": [
    "Таслах",
    "Hang up",
    "挂断"
  ],
  "call.board.mute": [
    "Микрофон хаах",
    "Mute microphone",
    "关闭麦克风"
  ],
  "call.board.unmute": [
    "Микрофон нээх",
    "Unmute microphone",
    "打开麦克风"
  ],
  "call.board.micLive": [
    "Микрофон асаалттай",
    "Microphone is live",
    "麦克风已开启"
  ],
  "call.board.micMuted": [
    "Микрофон хаасан",
    "Microphone muted",
    "麦克风已关闭"
  ],
  "call.board.micBlocked": [
    "Микрофон хаалттай",
    "Microphone blocked",
    "麦克风被禁用"
  ],
  "call.board.micNote": [
    "Хөтчийн тохиргооноос микрофоныг зөвшөөрвөл Багш таныг сонсох боломжтой. Одоо та зөвхөн сонсож байна.",
    "Allow the microphone in the browser settings so the teacher can hear you. For now you can only listen.",
    "在浏览器设置中允许使用麦克风，老师才能听到您。目前您只能收听。"
  ],
  "call.board.micInsecure": [
    "Микрофон ашиглахад HTTPS холболт шаардлагатай тул дуудлагыг зөвхөн сонсох боломжтой.",
    "The microphone needs a secure (HTTPS) connection, so calls can only be listened to.",
    "使用麦克风需要 HTTPS 安全连接，因此通话只能收听。"
  ],
  "call.board.tapForSound": [
    "Дуу гарахгүй байна. Дэлгэц дээр нэг товшино уу.",
    "No sound yet. Tap the screen once.",
    "暂时没有声音，请点按一下屏幕。"
  ],
  "call.board.teacherMuted": [
    "Багш микрофоноо хаасан байна.",
    "The teacher has muted their microphone.",
    "老师已关闭麦克风。"
  ],
  "call.board.timerLabel": [
    "Ярианы хугацаа",
    "Call duration",
    "通话时长"
  ],
  "call.board.end.hangup_teacher": [
    "Багш яриаг дуусгалаа.",
    "The teacher ended the call.",
    "老师结束了通话。"
  ],
  "call.board.end.cancelled": [
    "Багш дуудлагаа цуцаллаа.",
    "The teacher cancelled the call.",
    "老师取消了呼叫。"
  ],
  "call.board.end.missed": [
    "Дуудлага хариулагдсангүй.",
    "The call was not answered.",
    "呼叫无人接听。"
  ],
  "call.board.end.declined": [
    "Дуудлага татгалзагдлаа.",
    "The call was declined.",
    "呼叫已被拒绝。"
  ],
  "call.board.end.failed": [
    "Холболт тогтсонгүй.",
    "The connection could not be made.",
    "未能建立连接。"
  ],
  "call.board.end.lost": [
    "Холболт тасарлаа.",
    "The connection was lost.",
    "连接已中断。"
  ],
  "call.board.end.timeout": [
    "Яриа дээд хугацаандаа (30 минут) хүрч дууслаа.",
    "The call reached its 30 minute limit and ended.",
    "通话已达 30 分钟上限，自动结束。"
  ],
  "call.board.end.unsupported": [
    "Энэ хөтөч дуудлагыг дэмжихгүй байна.",
    "This browser does not support calls.",
    "此浏览器不支持通话。"
  ],
  "call.board.end.generic": [
    "Яриа дууслаа.",
    "The call has ended.",
    "通话已结束。"
  ],
  "call.micHint": [
    "Микрофон зөвшөөрөгдөөгүй тул дуудлагыг зөвхөн сонсох боломжтой. Хөтчийн тохиргооноос микрофоныг зөвшөөрнө үү.",
    "The microphone is not allowed, so calls can only be listened to. Allow it in the browser settings.",
    "未允许使用麦克风，因此通话只能收听。请在浏览器设置中允许。"
  ],
  "call.pillMicOff": [
    "микрофон хаалттай",
    "microphone off",
    "麦克风已关闭"
  ],
  "album.screenshots": [
    "Screenshot",
    "Screenshots",
    "截图"
  ],
  "schedule.factWeek": [
    "7 хоногт",
    "This week",
    "本周"
  ],
  "schedule.factPeriods": [
    "{count} цаг",
    "{count} periods",
    "{count} 节课"
  ],
  "schedule.factFree": [
    "Хичээлгүй",
    "No classes",
    "没有课程"
  ],
  "music.connectTitle": [
    "Дуу тоглуулагчийг холбох",
    "Connect the player",
    "连接播放器"
  ],
  "music.connectHint": [
    "Энэ том дэлгэц дээр нэг бүртгэлээр нэг удаа холбоорой.",
    "Connect once on this big screen with one account.",
    "在此大屏幕上用一个账号连接一次即可。"
  ],
  "music.connectButton": [
    "Холбох",
    "Connect",
    "连接"
  ],
  "music.connectHelp": [
    "Тоглуулагчийн Premium бүртгэлээ энэ дэлгэц дээр холбоно. Бүртгэл зөвшөөрөгдсөн байх хэрэгтэй. 403 алдаа гарвал сайтын эзнээр шалгуулаарай.",
    "Connect the player's Premium account on this screen. The account must be approved. If a 403 error appears, ask the site owner to check.",
    "在此屏幕上连接播放器的 Premium 账号，且该账号需已获授权。如出现 403 错误，请让网站管理员检查。"
  ],
  "music.playerControls": [
    "Тоглуулагч",
    "Player",
    "播放器"
  ],
  "music.lyrics": [
    "Үгс",
    "Lyrics",
    "歌词"
  ],
  "music.song": [
    "Дуу",
    "Song",
    "歌曲"
  ],
  "music.legacyTrack": [
    "Өмнөх дуу · энд тоглуулахгүй",
    "Earlier track · will not play here",
    "旧曲目 · 无法在此播放"
  ],
  "music.note": [
    "Ангийн плейлистүүд сайт дээр хадгалагдана.",
    "Class playlists are saved on this site.",
    "班级歌单保存在本网站上。"
  ],
  "music.noteIos": [
    "Дууны чангыг төхөөрөмжийн товчоор тааруулна.",
    "Adjust the volume with the device buttons.",
    "请使用设备按键调节音量。"
  ],
  "music.rateLimited": [
    "Түр хязгаарлалаа. {seconds} секундын дараа оролдоорой.",
    "Temporarily limited. Try again in {seconds} seconds.",
    "暂时受限，请在 {seconds} 秒后重试。"
  ],
  "music.retryIn": [
    "{seconds} секундын дараа дахин оролдоорой.",
    "Try again in {seconds} seconds.",
    "请在 {seconds} 秒后重试。"
  ],
  "music.gatewayDown": [
    "Холболтын сервер хариу өгсөнгүй. Хэдэн секунд хүлээгээд дахин оролдоорой.",
    "The connection server did not respond. Wait a few seconds and try again.",
    "连接服务器没有响应，请稍等几秒后重试。"
  ],
  "music.actionFailed": [
    "Үйлдэл амжилтгүй боллоо ({status}).",
    "The action failed ({status}).",
    "操作失败（{status}）。"
  ],
  "music.sessionExpired": [
    "Энэ дэлгэцийн холболтын хугацаа дууслаа. Дахин холбоорой.",
    "This screen's connection has expired. Connect again.",
    "此屏幕的连接已过期，请重新连接。"
  ],
  "music.serverSlow": [
    "Серверийн хариу удаж байна. Дахин оролдоорой.",
    "The server is responding slowly. Try again.",
    "服务器响应较慢，请重试。"
  ],
  "music.reconnect": [
    "Энэ дэлгэцийн тоглуулагчийг дахин холбоорой.",
    "Reconnect the player on this screen.",
    "请重新连接此屏幕的播放器。"
  ],
  "music.connectFirst": [
    "Дуу тоглуулахын өмнө тоглуулагчийг холбоорой.",
    "Connect the player before playing music.",
    "播放音乐前请先连接播放器。"
  ],
  "music.badConnectUrl": [
    "Холболтын хаяг буруу байна.",
    "The connection address is invalid.",
    "连接地址无效。"
  ],
  "music.playerMissing": [
    "Тоглуулагч ачаалагдсангүй. Хуудсыг дахин нээнэ үү.",
    "The player did not load. Reopen the page.",
    "播放器未能加载，请重新打开页面。"
  ],
  "music.connectScreenFirst": [
    "Эхлээд энэ дэлгэцийн тоглуулагчийг холбоорой.",
    "First connect the player on this screen.",
    "请先连接此屏幕的播放器。"
  ],
  "music.nothingPlayable": [
    "Энэ хэсэгт тоглуулах дуу алга. Дуу хайж нэмээрэй.",
    "There is nothing to play here. Search for songs to add.",
    "这里没有可播放的歌曲，请搜索并添加。"
  ],
  "music.playRequested": [
    "Тоглуулах хүсэлт илгээлээ.",
    "Play request sent.",
    "已发送播放请求。"
  ],
  "music.playerNotReady": [
    "Тоглуулагч хараахан бэлэн болоогүй байна.",
    "The player is not ready yet.",
    "播放器尚未就绪。"
  ],
  "music.sp.sdkLoad": [
    "Тоглуулагч ачаалагдсангүй. Холболтоо шалгаад дахин оролдоорой.",
    "The player did not load. Check your connection and try again.",
    "播放器未能加载，请检查网络后重试。"
  ],
  "music.sp.tokenBad": [
    "Нэвтрэлтийн хариу хүчингүй байна.",
    "The sign-in response is invalid.",
    "登录响应无效。"
  ],
  "music.sp.pb401": [
    "Нэвтрэлт дууссан байна. Дахин холбоорой.",
    "The sign-in has expired. Connect again.",
    "登录已过期，请重新连接。"
  ],
  "music.sp.pb403": [
    "Тоглуулах эрх хүрэлцэхгүй байна. Premium болон аппын зөвшөөрлөө шалгана уу.",
    "Not enough permission to play. Check the Premium plan and the app's authorization.",
    "播放权限不足，请检查 Premium 和应用授权。"
  ],
  "music.sp.pb404": [
    "Тоглуулагч хараахан бэлэн биш байна. Хэдэн секунд хүлээгээд дахин Сонсох дарна уу.",
    "The player is not ready yet. Wait a few seconds and press Play again.",
    "播放器尚未就绪，请稍等几秒后再次点击“收听”。"
  ],
  "music.sp.pb429": [
    "Түр хязгаарлалаа. Түр хүлээгээд дахин оролдоорой.",
    "Temporarily limited. Wait a moment and try again.",
    "暂时受限，请稍候再试。"
  ],
  "music.sp.pb5xx": [
    "Дуу тоглуулах хүсэлтэд хариу өгсөнгүй. Тоглож байгаа эсэхийг шалгаад дахин оролдоорой.",
    "The play request got no response. Check whether it is playing and try again.",
    "播放请求没有响应，请确认是否在播放后重试。"
  ],
  "music.sp.pbRestricted": [
    "Энэ дууг энэ бүртгэл дээр тоглуулах боломжгүй байна. Өөр дуу сонгоорой.",
    "This song cannot be played on this account. Pick another song.",
    "此账号无法播放这首歌，请选择其他歌曲。"
  ],
  "music.sp.pbDefault": [
    "Энэ дууг тоглуулж чадсангүй. Өөр дуу сонгох эсвэл дахин оролдоорой.",
    "This song could not be played. Pick another song or try again.",
    "无法播放这首歌，请选择其他歌曲或重试。"
  ],
  "music.sp.offline": [
    "Энэ дэлгэц холбогдсонгүй. Интернет холболтоо шалгаад дахин оролдоорой.",
    "This screen could not connect. Check the internet connection and try again.",
    "此屏幕无法连接，请检查网络后重试。"
  ],
  "music.sp.deviceLost": [
    "Төхөөрөмжийн холболт тасарлаа. Тоглуулагчийг дахин нээнэ үү.",
    "The device connection was lost. Reopen the player.",
    "设备连接已断开，请重新打开播放器。"
  ],
  "music.sp.initFail": [
    "Энэ хөтөч хамгаалалттай тоглуулагчийг нээж чадсангүй. Шинэ Chrome, Edge эсвэл Safari ашиглана уу.",
    "This browser could not open the protected player. Use a recent Chrome, Edge or Safari.",
    "此浏览器无法打开受保护的播放器，请使用较新的 Chrome、Edge 或 Safari。"
  ],
  "music.sp.authExpired": [
    "Холболтын эрх дууссан байна. Дахин холбоорой.",
    "The connection's authorization has expired. Connect again.",
    "连接授权已过期，请重新连接。"
  ],
  "music.sp.accountPremium": [
    "Энд дуу тоглуулахад Premium бүртгэл хэрэгтэй.",
    "A Premium account is needed to play music here.",
    "在此播放音乐需要 Premium 账号。"
  ],
  "music.sp.playbackError": [
    "Энэ дууг тоглуулж чадсангүй. Өөр дуу сонгоорой.",
    "This song could not be played. Pick another song.",
    "无法播放这首歌，请选择其他歌曲。"
  ],
  "music.sp.deviceTimeout": [
    "Төхөөрөмж бэлэн болсонгүй. Дахин нээж үзнэ үү.",
    "The device did not become ready. Try opening it again.",
    "设备未能就绪，请重新打开试试。"
  ],
  "music.sp.connectFail": [
    "Тоглуулагчтай холбогдсонгүй. Дахин нээнэ үү.",
    "Could not connect to the player. Reopen it.",
    "无法连接播放器，请重新打开。"
  ],
  "music.sp.badTrack": [
    "Дуу хүчингүй байна.",
    "The song is invalid.",
    "歌曲无效。"
  ],
  "music.sp.pickTrack": [
    "Эхлээд дуу сонгоорой.",
    "Pick a song first.",
    "请先选择一首歌。"
  ],
  "music.sp.notReady": [
    "Тоглуулагч бэлэн биш байна.",
    "The player is not ready.",
    "播放器未就绪。"
  ],
  "music.sp.seekDenied": [
    "Энэ дууны цагийг шилжүүлэхийг зөвшөөрөхгүй байна.",
    "Seeking is not allowed for this song.",
    "这首歌不允许跳转进度。"
  ],
  "music.sp.seekTimeout": [
    "Цаг шилжүүлэх хүсэлтэд хариу өгсөнгүй. Холболтоо шалгаад дахин оролдоорой.",
    "The seek request got no response. Check your connection and try again.",
    "跳转请求没有响应，请检查网络后重试。"
  ],
  "Холболт удааширлаа. Хэдэн секунд хүлээгээд дахин оролдоорой.": [
    "Холболт удааширлаа. Хэдэн секунд хүлээгээд дахин оролдоорой.",
    "The connection is slow. Wait a few seconds and try again.",
    "连接较慢，请稍等几秒后重试。"
  ],
  "Тоглуулагчийн тохиргоо хүчингүй байна.": [
    "Тоглуулагчийн тохиргоо хүчингүй байна.",
    "The player settings are invalid.",
    "播放器设置无效。"
  ],
  "Нэвтрэлтийг хадгалах боломжгүй байна.": [
    "Нэвтрэлтийг хадгалах боломжгүй байна.",
    "The sign-in could not be saved.",
    "无法保存登录信息。"
  ],
  "Хүсэлт хүчингүй байна.": [
    "Хүсэлт хүчингүй байна.",
    "The request is invalid.",
    "请求无效。"
  ],
  "Дахин нэвтэрнэ үү.": [
    "Дахин нэвтэрнэ үү.",
    "Please sign in again.",
    "请重新登录。"
  ],
  "Зөвшөөрөл хүрэлцэхгүй байна. Premium эрх болон аппын зөвшөөрлийг шалгана уу.": [
    "Зөвшөөрөл хүрэлцэхгүй байна. Premium эрх болон аппын зөвшөөрлийг шалгана уу.",
    "Not enough permission. Check the Premium plan and the app's authorization.",
    "权限不足，请检查 Premium 和应用授权。"
  ],
  "Хүсэлтийн хязгаарт хүрлээ. Түр хүлээгээд дахин оролдоорой.": [
    "Хүсэлтийн хязгаарт хүрлээ. Түр хүлээгээд дахин оролдоорой.",
    "The request limit was reached. Wait a moment and try again.",
    "已达到请求上限，请稍候再试。"
  ],
  "Дуу, плейлист эсвэл тоглуулагч олдсонгүй.": [
    "Дуу, плейлист эсвэл тоглуулагч олдсонгүй.",
    "The song, playlist or player was not found.",
    "未找到歌曲、歌单或播放器。"
  ],
  "Дуу тоглуулах үйлчилгээ одоогоор хариу өгөхгүй байна. Дахин оролдоорой.": [
    "Дуу тоглуулах үйлчилгээ одоогоор хариу өгөхгүй байна. Дахин оролдоорой.",
    "The music service is not responding right now. Try again.",
    "音乐服务暂时没有响应，请重试。"
  ],
  "Нэвтрэлтийн хариу хүчингүй байна.": [
    "Нэвтрэлтийн хариу хүчингүй байна.",
    "The sign-in response is invalid.",
    "登录响应无效。"
  ],
  "Эхлээд тоглуулагчийг холбоорой.": [
    "Эхлээд тоглуулагчийг холбоорой.",
    "Connect the player first.",
    "请先连接播放器。"
  ],
  "Нэвтрэлт дууссан байна. Дахин холбогдоорой.": [
    "Нэвтрэлт дууссан байна. Дахин холбогдоорой.",
    "The sign-in has expired. Connect again.",
    "登录已过期，请重新连接。"
  ],
  "Нэвтрэлтийн холбоос дууссан эсвэл хүчингүй байна. Дахин холбогдоорой.": [
    "Нэвтрэлтийн холбоос дууссан эсвэл хүчингүй байна. Дахин холбогдоорой.",
    "The sign-in link has expired or is invalid. Connect again.",
    "登录链接已过期或无效，请重新连接。"
  ],
  "Нэвтрэлтийг цуцаллаа. Хүсвэл дахин холбогдоорой.": [
    "Нэвтрэлтийг цуцаллаа. Хүсвэл дахин холбогдоорой.",
    "The sign-in was cancelled. Connect again if you wish.",
    "登录已取消，如需使用请重新连接。"
  ],
  "Нэвтрэлтийн код хүчингүй байна.": [
    "Нэвтрэлтийн код хүчингүй байна.",
    "The sign-in code is invalid.",
    "登录代码无效。"
  ],
  "Нэвтрэлтийн хариу хүчингүй байна. Дахин холбогдоорой.": [
    "Нэвтрэлтийн хариу хүчингүй байна. Дахин холбогдоорой.",
    "The sign-in response is invalid. Connect again.",
    "登录响应无效，请重新连接。"
  ],
  "Дуу хүчингүй байна.": [
    "Дуу хүчингүй байна.",
    "The song is invalid.",
    "歌曲无效。"
  ],
  "Үйлдэл олдсонгүй.": [
    "Үйлдэл олдсонгүй.",
    "Action not found.",
    "未找到该操作。"
  ],
  "Үйлдэл амжилтгүй боллоо. Дахин оролдоорой.": [
    "Үйлдэл амжилтгүй боллоо. Дахин оролдоорой.",
    "The action failed. Try again.",
    "操作失败，请重试。"
  ],
  "Тоглуулагч амжилттай холбогдлоо.": [
    "Тоглуулагч амжилттай холбогдлоо.",
    "The player was connected.",
    "播放器已连接。"
  ],
  "Нэвтрэлт амжилтгүй боллоо. Дахин оролдоорой.": [
    "Нэвтрэлт амжилтгүй боллоо. Дахин оролдоорой.",
    "The sign-in failed. Try again.",
    "登录失败，请重试。"
  ],
  "Дууны ID буруу байна.": [
    "Дууны ID буруу байна.",
    "The song ID is invalid.",
    "歌曲 ID 无效。"
  ],
  "Том дэлгэц дээр эхлээд тоглуулагчийг холбоорой.": [
    "Том дэлгэц дээр эхлээд тоглуулагчийг холбоорой.",
    "First connect the player on the big screen.",
    "请先在大屏幕上连接播放器。"
  ],
  "Дууны мэдээлэл олдсонгүй.": [
    "Дууны мэдээлэл олдсонгүй.",
    "Song information was not found.",
    "未找到歌曲信息。"
  ],
  "Аудио файл байршуулах, хуулж хадгалах болон татах боломжийг хаасан. Дуунууд шууд тоглуулагдана.": [
    "Аудио файл байршуулах, хуулж хадгалах болон татах боломжийг хаасан. Дуунууд шууд тоглуулагдана.",
    "Uploading, copying, saving and downloading audio files is disabled. Songs are streamed directly.",
    "已禁止上传、复制、保存和下载音频文件，歌曲直接在线播放。"
  ],
  "Аудио файл нэмэх боломжгүй. Хайлтаас дуу сонгоно уу.": [
    "Аудио файл нэмэх боломжгүй. Хайлтаас дуу сонгоно уу.",
    "Audio files cannot be added. Pick a song from the search.",
    "无法添加音频文件，请从搜索结果中选歌。"
  ],
  "Дууны нэр болон уран бүтээлчийн мэдээллийг өөрчлөх боломжгүй.": [
    "Дууны нэр болон уран бүтээлчийн мэдээллийг өөрчлөх боломжгүй.",
    "The song title and artist cannot be changed.",
    "无法修改歌曲名称和艺人信息。"
  ],
  "Түр хүлээгээд дахин оролдоорой.": [
    "Түр хүлээгээд дахин оролдоорой.",
    "Wait a moment and try again.",
    "请稍候再试。"
  ],
  "Эхлээд дуу сонгоорой.": [
    "Эхлээд дуу сонгоорой.",
    "Pick a song first.",
    "请先选择一首歌。"
  ],
  "Хүсэлт хэт том байна.": [
    "Хүсэлт хэт том байна.",
    "The request is too large.",
    "请求过大。"
  ],
  "Тоглуулагч бэлэн болохыг хүлээнэ үү.": [
    "Тоглуулагч бэлэн болохыг хүлээнэ үү.",
    "Wait for the player to be ready.",
    "请等待播放器就绪。"
  ],
  "lyrics.toggle": [
    "Дууны үг",
    "Lyrics",
    "歌词"
  ],
  "lyrics.heading": [
    "Дууны үг",
    "Lyrics",
    "歌词"
  ],
  "lyrics.idle": [
    "Дуу тоглуулахад үг энд гарна.",
    "Lyrics will appear here when a song is playing.",
    "播放歌曲时，歌词会显示在这里。"
  ],
  "lyrics.loading": [
    "Дууны үгийг хайж байна…",
    "Looking for lyrics…",
    "正在查找歌词…"
  ],
  "lyrics.none": [
    "Энэ дууны үг олдсонгүй.",
    "No lyrics found for this song.",
    "未找到这首歌的歌词。"
  ],
  "lyrics.instrumental": [
    "Хөгжим дангаараа — үггүй дуу.",
    "Instrumental, no lyrics.",
    "纯音乐，没有歌词。"
  ],
  "lyrics.plainNote": [
    "Энэ дууны үг цагтай холбогдоогүй тул гүйлгэн унших боломжтой.",
    "These lyrics are not timed, so scroll to read them.",
    "这些歌词没有时间轴，请滚动阅读。"
  ],
  "lyrics.err.unavailable": [
    "Дууны үгийн үйлчилгээ одоогоор хариу өгөхгүй байна.",
    "The lyrics service is not responding right now.",
    "歌词服务暂时没有响应。"
  ],
  "lyrics.err.locked": [
    "Дууны үг үзэхийн тулд цомгийн кодоо оруулна уу.",
    "Enter the album code to see lyrics.",
    "请输入相册密码以查看歌词。"
  ],
  "lyrics.err.rate": [
    "Хэт олон хүсэлт илгээлээ. Түр хүлээгээд дахин оролдоорой.",
    "Too many requests. Wait a moment and try again.",
    "请求过多，请稍等片刻再试。"
  ],
  "lyrics.err.generic": [
    "Дууны үгийг ачаалж чадсангүй.",
    "Could not load the lyrics.",
    "无法加载歌词。"
  ],
  "lyrics.retry": [
    "Дахин оролдох",
    "Try again",
    "重试"
  ],
  "lyrics.nudge": [
    "Үгийн хугацаа тохируулах",
    "Adjust lyric timing",
    "调整歌词时间"
  ],
  "lyrics.earlier": [
    "Үгийг 0.5 секундээр түрүүлэх",
    "Show lyrics 0.5 seconds earlier",
    "歌词提前0.5秒"
  ],
  "lyrics.later": [
    "Үгийг 0.5 секундээр хойшлуулах",
    "Show lyrics 0.5 seconds later",
    "歌词延后0.5秒"
  ],
  "lyrics.offsetReset": [
    "Хугацааг анхны байдалд оруулах",
    "Reset lyric timing",
    "重置歌词时间"
  ],
  "lyrics.offsetValue": [
    "{n}с",
    "{n}s",
    "{n}秒"
  ],
  "lyrics.full": [
    "Бүтэн дэлгэцээр харах",
    "View full screen",
    "全屏查看"
  ],
  "lyrics.fullExit": [
    "Бүтэн дэлгэцээс гарах",
    "Exit full screen",
    "退出全屏"
  ],
  "lyrics.credit": [
    "Дууны үг: LRCLIB",
    "Lyrics: LRCLIB",
    "歌词：LRCLIB"
  ],
  "lyrics.seekHint": [
    "Мөр дээр дарж дууг тэр хэсгээс нь сонсоно.",
    "Select a line to play the song from that point.",
    "选择一行即可从该处播放。"
  ],
  "board.title": [
    "САМБАР",
    "BOARD",
    "白板"
  ],
  "board.intro": [
    "Хичээлээ зур. Санаагаа бич. Шинэ хуудсанд үргэлжлүүл.",
    "Draw your lesson. Sketch your ideas. Carry on on a new page.",
    "绘制课程内容，记录想法，再翻到新的一页继续。"
  ],
  "board.unlockNote": [
    "Цомгийн кодоор нээгээд, хичээлийн самбараа бүх төхөөрөмжөөс ашиглаарай.",
    "Unlock with the album code and use your lesson board from any device.",
    "输入相册密码解锁，即可在任何设备上使用课堂白板。"
  ],
  "board.newBoard": [
    "Шинэ самбар",
    "New board",
    "新建白板"
  ],
  "board.search": [
    "Самбарын нэрээр хайх",
    "Search boards by name",
    "按名称搜索白板"
  ],
  "board.refresh": [
    "Шинэчлэх",
    "Refresh",
    "刷新"
  ],
  "board.collectionNote": [
    "Үзэг, баллуур, шугам, зураг — хуудсууд вэбсайтад хадгалагдана.",
    "Pen, eraser, ruler and pictures — your pages are saved on the website.",
    "画笔、橡皮、直尺和图片——页面会保存在网站上。"
  ],
  "board.allBoards": [
    "Бүх самбар",
    "All boards",
    "全部白板"
  ],
  "board.renameBoard": [
    "Самбарын нэрийг өөрчлөх",
    "Rename board",
    "重命名白板"
  ],
  "board.save": [
    "Хадгалах",
    "Save",
    "保存"
  ],
  "board.png": [
    "PNG татах",
    "Download PNG",
    "下载 PNG"
  ],
  "board.fullscreen": [
    "Бүтэн дэлгэц",
    "Full screen",
    "全屏"
  ],
  "board.deleteBoard": [
    "Самбар устгах",
    "Delete board",
    "删除白板"
  ],
  "board.conflict": [
    "Өөр төхөөрөмж энэ самбарыг өөрчилжээ. Өөрийн зурлагыг хуулбар болгон хадгалах эсвэл вэбсайтаас дахин нээгээрэй.",
    "Another device changed this board. Save your drawing as a copy, or reopen the board from the website.",
    "另一台设备修改了这个白板。可将你的内容另存为副本，或从网站重新打开。"
  ],
  "board.saveCopy": [
    "Хуулбар хадгалах",
    "Save as copy",
    "另存为副本"
  ],
  "board.reload": [
    "Дахин нээх",
    "Reopen",
    "重新打开"
  ],
  "board.tools": [
    "Самбарын хэрэгслүүд",
    "Board tools",
    "白板工具"
  ],
  "board.pen": [
    "Үзэг",
    "Pen",
    "画笔"
  ],
  "board.eraser": [
    "Баллуур",
    "Eraser",
    "橡皮"
  ],
  "board.select": [
    "Сонгох",
    "Select",
    "选择"
  ],
  "board.ruler": [
    "Шугам",
    "Ruler",
    "直尺"
  ],
  "board.album": [
    "Цомгоос",
    "From album",
    "相册图片"
  ],
  "board.undo": [
    "Буцаах",
    "Undo",
    "撤销"
  ],
  "board.redo": [
    "Дахин хийх",
    "Redo",
    "重做"
  ],
  "board.clear": [
    "Цэвэрлэх",
    "Clear",
    "清空"
  ],
  "board.color": [
    "Өнгө",
    "Colour",
    "颜色"
  ],
  "board.customColor": [
    "Өөр өнгө",
    "Custom colour",
    "自定义颜色"
  ],
  "board.width": [
    "Хэмжээ",
    "Size",
    "粗细"
  ],
  "board.eraserSize": [
    "Баллуурын хэмжээ",
    "Eraser size",
    "橡皮大小"
  ],
  "board.eraseMode": [
    "Баллуурын төрөл",
    "Eraser type",
    "橡皮类型"
  ],
  "board.eraseArea": [
    "Хэсэгчлэн",
    "Partial",
    "局部擦除"
  ],
  "board.eraseStroke": [
    "Бүтэн зураас",
    "Whole stroke",
    "整条笔画"
  ],
  "board.selectHint": [
    "Зүйл дээр дарж эсвэл хүрээ татаж сонгоно. Зөөх, булангаас нь хэмжээг өөрчлөх, Устгах товч.",
    "Tap an item or drag a box to select. Move it, resize from a corner, or press Delete.",
    "点击对象或拖出选框进行选择；可移动、拖动角点缩放，或点击“删除”。"
  ],
  "board.rulerHint": [
    "Шугамыг чирж зөөнө, үзүүрээс нь эргүүлнэ. Үзгээр шугамын ирмэгийн дагуу зурахад шулуун зураас гарна.",
    "Drag the ruler to move it and turn it by its ends. Draw along its edge with the pen for a straight line.",
    "拖动直尺可移动，拖动两端可旋转。用画笔沿直尺边缘书写即可画出直线。"
  ],
  "board.rulerHide": [
    "Шугам нуух",
    "Hide ruler",
    "隐藏直尺"
  ],
  "board.rulerShown": [
    "Шугам гарлаа",
    "Ruler shown",
    "直尺已显示"
  ],
  "board.rulerHidden": [
    "Шугам нуугдлаа",
    "Ruler hidden",
    "直尺已隐藏"
  ],
  "board.background": [
    "Дэвсгэр",
    "Background",
    "背景"
  ],
  "board.plain": [
    "Цагаан",
    "Plain",
    "空白"
  ],
  "board.grid": [
    "Дөрвөлжин",
    "Grid",
    "方格"
  ],
  "board.ruled": [
    "Шугамтай",
    "Lined",
    "横线"
  ],
  "board.dark": [
    "Хар самбар",
    "Blackboard",
    "黑板"
  ],
  "board.deselect": [
    "Сонголт болих",
    "Deselect",
    "取消选择"
  ],
  "board.delete": [
    "Устгах",
    "Delete",
    "删除"
  ],
  "board.selected": [
    "{count} зүйл сонгосон",
    "{count} selected",
    "已选择 {count} 项"
  ],
  "board.deleted": [
    "{count} зүйл устгагдлаа",
    "{count} deleted",
    "已删除 {count} 项"
  ],
  "board.canvas": [
    "Хичээлийн самбар. Үзэг эсвэл хуруугаар зурна.",
    "Lesson board. Draw with a pen or your finger.",
    "课堂白板，可用笔或手指书写。"
  ],
  "board.shortcuts": [
    "P үзэг · E баллуур · V сонгох · R шугам · Delete устгах · Ctrl Z буцаах",
    "P pen · E eraser · V select · R ruler · Delete remove · Ctrl Z undo",
    "P 画笔 · E 橡皮 · V 选择 · R 直尺 · Delete 删除 · Ctrl Z 撤销"
  ],
  "board.fit": [
    "Бүтнээр харах",
    "Fit to screen",
    "适应屏幕"
  ],
  "board.zoomIn": [
    "Томруулах",
    "Zoom in",
    "放大"
  ],
  "board.zoomOut": [
    "Жижигрүүлэх",
    "Zoom out",
    "缩小"
  ],
  "board.previous": [
    "Өмнөх хуудас",
    "Previous page",
    "上一页"
  ],
  "board.next": [
    "Дараагийн хуудас",
    "Next page",
    "下一页"
  ],
  "board.renamePage": [
    "Хуудасны нэрийг өөрчлөх",
    "Rename page",
    "重命名页面"
  ],
  "board.newPage": [
    "Шинэ хуудас",
    "New page",
    "新建页面"
  ],
  "board.deletePage": [
    "Хуудас устгах",
    "Delete page",
    "删除页面"
  ],
  "board.pages": [
    "Самбарын хуудсууд",
    "Board pages",
    "白板页面"
  ],
  "board.cancel": [
    "Цуцлах",
    "Cancel",
    "取消"
  ],
  "board.ok": [
    "Болсон",
    "OK",
    "确定"
  ],
  "board.nameRequired": [
    "Нэрээ бичнэ үү",
    "Please enter a name",
    "请输入名称"
  ],
  "board.newBoardTitle": [
    "Шинэ самбарын нэр",
    "New board name",
    "新白板名称"
  ],
  "board.defaultTitle": [
    "Самбар",
    "Board",
    "白板"
  ],
  "board.pageName": [
    "Хуудас {n}",
    "Page {n}",
    "第 {n} 页"
  ],
  "board.pageCount": [
    "{count} хуудас",
    "{count} pages",
    "{count} 页"
  ],
  "board.maxPages": [
    "Хуудасны тоо дээд хязгаарт хүрсэн байна",
    "The page limit has been reached",
    "已达到页数上限"
  ],
  "board.deletePageTitle": [
    "Энэ хуудсыг устгах уу?",
    "Delete this page?",
    "删除此页面？"
  ],
  "board.deletePageText": [
    "Хуудасны бүх зураглал устна. «Буцаах» товчоор сэргээж болно.",
    "Everything on this page will be removed. You can bring it back with Undo.",
    "此页面的所有内容都会被移除，可用“撤销”恢复。"
  ],
  "board.clearTitle": [
    "Хуудсыг цэвэрлэх үү?",
    "Clear this page?",
    "清空此页面？"
  ],
  "board.clearText": [
    "Хуудасны бүх зураглал арилна. «Буцаах» товчоор сэргээж болно.",
    "Everything on this page will be erased. You can bring it back with Undo.",
    "此页面的所有内容都会被擦除，可用“撤销”恢复。"
  ],
  "board.deleteBoardTitle": [
    "Энэ самбарыг устгах уу?",
    "Delete this board?",
    "删除此白板？"
  ],
  "board.deleteBoardText": [
    "Бүх хуудас бүрмөсөн устах бөгөөд сэргээх боломжгүй.",
    "All pages will be permanently deleted and cannot be restored.",
    "所有页面将被永久删除，无法恢复。"
  ],
  "board.deletedBoard": [
    "Самбар устгагдлаа",
    "Board deleted",
    "白板已删除"
  ],
  "board.emptyTitle": [
    "Одоогоор самбар алга",
    "No boards yet",
    "还没有白板"
  ],
  "board.emptyText": [
    "«Шинэ самбар» товчийг дарж эхлээрэй.",
    "Press “New board” to get started.",
    "点击“新建白板”开始使用。"
  ],
  "board.noMatch": [
    "Тохирох самбар олдсонгүй",
    "No matching boards",
    "没有匹配的白板"
  ],
  "board.loading": [
    "Ачаалж байна…",
    "Loading…",
    "加载中…"
  ],
  "board.opening": [
    "Самбарыг нээж байна…",
    "Opening the board…",
    "正在打开白板…"
  ],
  "board.saved": [
    "Вэбсайтад хадгалагдсан",
    "Saved to the website",
    "已保存到网站"
  ],
  "board.saving": [
    "Хадгалж байна…",
    "Saving…",
    "正在保存…"
  ],
  "board.unsaved": [
    "Автоматаар хадгална…",
    "Will save automatically…",
    "将自动保存…"
  ],
  "board.offline": [
    "Холболтгүй · Холбогдмогц хадгална",
    "Offline · will save when reconnected",
    "离线 · 联网后将保存"
  ],
  "board.saveError": [
    "Хадгалж чадсангүй",
    "Could not save",
    "保存失败"
  ],
  "board.conflictStatus": [
    "Өөр төхөөрөмж өөрчилсөн",
    "Changed on another device",
    "已在其他设备上修改"
  ],
  "board.tooLarge": [
    "Самбар хэт том байна. Хуудас устгах эсвэл шинэ самбар нээнэ үү.",
    "This board is too large. Delete a page or start a new board.",
    "白板过大。请删除页面或新建白板。"
  ],
  "board.stillUnsaved": [
    "Хадгалагдаагүй өөрчлөлт байна. Дахин оролдоно уу.",
    "There are unsaved changes. Please try again.",
    "还有未保存的更改，请重试。"
  ],
  "board.copy": [
    "хуулбар",
    "copy",
    "副本"
  ],
  "board.copySaved": [
    "Хуулбар хадгалагдлаа",
    "Copy saved",
    "副本已保存"
  ],
  "board.undone": [
    "Буцаалаа",
    "Undone",
    "已撤销"
  ],
  "board.redone": [
    "Дахин хийлээ",
    "Redone",
    "已重做"
  ],
  "board.imageAdded": [
    "Зураг нэмэгдлээ",
    "Picture added",
    "图片已添加"
  ],
  "board.imageMissing": [
    "Зураг олдсонгүй",
    "Picture not found",
    "找不到图片"
  ],
  "board.exportFail": [
    "PNG үүсгэж чадсангүй",
    "Could not create the PNG",
    "无法生成 PNG"
  ],
  "board.unitCm": [
    "см",
    "cm",
    "厘米"
  ],
  "board.pickTitle": [
    "Цомгоос зураг сонгох",
    "Choose a picture from the album",
    "从相册选择图片"
  ],
  "board.pickSearch": [
    "Зургийн нэрээр хайх",
    "Search pictures by name",
    "按名称搜索图片"
  ],
  "board.pickLoading": [
    "Цомгийн зургийг ачаалж байна…",
    "Loading album pictures…",
    "正在加载相册图片…"
  ],
  "board.pickEmpty": [
    "Цомогт зураг алга. Эхлээд цомогт зураг нэмнэ үү.",
    "The album has no pictures. Add pictures to the album first.",
    "相册里还没有图片，请先向相册添加图片。"
  ],
  "board.pickNone": [
    "Тохирох зураг олдсонгүй",
    "No matching pictures",
    "没有匹配的图片"
  ],
  "board.pickCount": [
    "{count} зураг",
    "{count} pictures",
    "{count} 张图片"
  ],
  "mirror.screenshot": [
    "SCREENSHOT",
    "SCREENSHOT",
    "截图"
  ],
  "mirror.shotMenu": [
    "Нэмэлт үйлдлүүд",
    "More actions",
    "更多操作"
  ],
  "mirror.shotSaving": [
    "Screenshot хадгалж байна…",
    "Saving screenshot…",
    "正在保存截图…"
  ],
  "mirror.shotSaved": [
    "Screenshot цомогт хадгалагдлаа",
    "Screenshot saved to the album",
    "截图已保存到相册"
  ],
  "mirror.shotView": [
    "Үзэх",
    "View",
    "查看"
  ],
  "mirror.shotNoFrame": [
    "Дүрс бэлэн болоогүй байна. Хэдхэн секундийн дараа дахин оролдоно уу.",
    "The picture is not ready yet. Try again in a few seconds.",
    "画面尚未就绪，请几秒后重试。"
  ],
  "mirror.shotFailed": [
    "Screenshot хадгалж чадсангүй. Дахин оролдоно уу.",
    "The screenshot could not be saved. Please try again.",
    "无法保存截图，请重试。"
  ],
  "mirror.shotTooLarge": [
    "Screenshot хэт том байна. Дүрсний тохиргоог багасгаад дахин оролдоно уу.",
    "The screenshot is too large. Lower the picture quality and try again.",
    "截图过大。请降低画质后重试。"
  ],
  "mirror.shotNeedCode": [
    "Цомгийн код шаардлагатай",
    "Album code required",
    "需要相册密码"
  ],
  "mirror.shotNeedCodeText": [
    "Screenshot-ыг ангийн цомогт хадгалахын тулд цомгийн 4 оронтой кодоо оруулна уу.",
    "Enter the four-digit album code to save the screenshot to the class album.",
    "请输入4位相册密码，以便将截图保存到班级相册。"
  ],
  "mirror.shotEnterCode": [
    "Код оруулах",
    "Enter code",
    "输入密码"
  ],
  "mirror.shotCancelled": [
    "Цомгийн код оруулаагүй тул screenshot хадгалагдсангүй.",
    "The screenshot was not saved because the album code was not entered.",
    "未输入相册密码，截图未保存。"
  ],
  "album.screenshotTag": [
    "Screenshot",
    "Screenshot",
    "截图"
  ],
  "album.noScreenshots": [
    "Screenshot алга",
    "No screenshots yet",
    "暂无截图"
  ],
  "album.screenshotHint": [
    "Дэлгэц хуваалцаж байх үед ⋮ цэснээс SCREENSHOT авч цомогт хадгална.",
    "While a screen is being shared, use the ⋮ menu and choose SCREENSHOT to save it here.",
    "屏幕共享时，点击 ⋮ 菜单并选择“截图”即可保存到这里。"
  ],
  "note.title": [
    "Багшийн тэмдэглэл",
    "Teacher's Note",
    "老师留言"
  ],
  "note.lead": [
    "Тэмдэглэл бичиж, төрлөө сонгоод илгээнэ үү. Сонсож буй самбарууд эхлээд дуу тоглуулж, дараа нь тэмдэглэлийг дэлгэцэн дээр гаргана.",
    "Write a note, pick its kind and send it. Listening boards first play a sound, then show the note on screen.",
    "写好留言并选择类型后发送。处于监听状态的大屏会先播放提示音，再把留言显示在屏幕上。"
  ],
  "note.boards.some": [
    "{count} самбар холбогдсон",
    "{count} board(s) connected",
    "已连接 {count} 个大屏"
  ],
  "note.boards.none": [
    "Холбогдсон самбар алга",
    "No boards connected",
    "没有已连接的大屏"
  ],
  "note.boards.checking": [
    "Самбарын төлөвийг шалгаж байна…",
    "Checking boards…",
    "正在检查大屏状态…"
  ],
  "note.boards.hint": [
    "Самбар дээр сайтыг нээж «Intercom сонсох» товчийг дарвал тэмдэглэл түүн дээр гарна.",
    "Open the site on a board and tap \"Listen to Intercom\": notes will then appear on it.",
    "在大屏上打开网站并点击“收听广播”，留言就会显示在上面。"
  ],
  "note.typeLegend": [
    "Төрөл",
    "Kind",
    "类型"
  ],
  "note.type.urgent": [
    "Яаралтай",
    "Urgent",
    "紧急"
  ],
  "note.type.normal": [
    "Энхийн",
    "Regular",
    "普通"
  ],
  "note.type.info": [
    "Мэдээлэл",
    "Info",
    "通知"
  ],
  "note.titleLabel": [
    "Гарчиг (заавал биш)",
    "Title (optional)",
    "标题（可选）"
  ],
  "note.titlePlaceholder": [
    "Жишээ: Хичээл өөрчлөгдлөө",
    "e.g. The lesson has changed",
    "例如：课程有变动"
  ],
  "note.textLabel": [
    "Тэмдэглэл",
    "Note",
    "留言内容"
  ],
  "note.textPlaceholder": [
    "Самбар дээр харагдах текстээ энд бичнэ үү…",
    "Write the text the board should show…",
    "在此输入要在大屏上显示的内容…"
  ],
  "note.send": [
    "Илгээх",
    "Send",
    "发送"
  ],
  "note.sending": [
    "Илгээж байна…",
    "Sending…",
    "发送中…"
  ],
  "note.sent": [
    "Тэмдэглэл илгээгдлээ.",
    "Note sent.",
    "留言已发送。"
  ],
  "note.sentNone": [
    "Тэмдэглэл хадгалагдлаа, гэхдээ одоогоор холбогдсон самбар алга.",
    "Note saved, but no board is connected right now.",
    "留言已保存，但目前没有已连接的大屏。"
  ],
  "note.resent": [
    "Тэмдэглэл дахин илгээгдлээ.",
    "Note sent again.",
    "留言已重新发送。"
  ],
  "note.deleted": [
    "Тэмдэглэл устгагдлаа.",
    "Note deleted.",
    "留言已删除。"
  ],
  "note.cleared": [
    "Бүх тэмдэглэл устгагдлаа.",
    "All notes deleted.",
    "所有留言已删除。"
  ],
  "note.previewTitle": [
    "Самбар дээр ингэж харагдана",
    "How it will look on the board",
    "大屏上的显示效果"
  ],
  "note.previewEmpty": [
    "Тэмдэглэлийн текст энд харагдана…",
    "Your note text will appear here…",
    "留言内容将显示在这里…"
  ],
  "note.soundWarn": [
    "Дууны файл (assets/audio/teacher.mp3) серверээс олдсонгүй тул тэмдэглэл дуугүй гарна.",
    "The sound file (assets/audio/teacher.mp3) was not found on the server, so notes will appear without sound.",
    "服务器上找不到提示音文件（assets/audio/teacher.mp3），留言将无声显示。"
  ],
  "note.historyTitle": [
    "Сүүлийн тэмдэглэлүүд",
    "Recent notes",
    "最近的留言"
  ],
  "note.historyEmpty": [
    "Одоогоор тэмдэглэл илгээгээгүй байна.",
    "No notes have been sent yet.",
    "尚未发送任何留言。"
  ],
  "note.resend": [
    "Дахин илгээх",
    "Resend",
    "重新发送"
  ],
  "note.delete": [
    "Устгах",
    "Delete",
    "删除"
  ],
  "note.clear": [
    "Бүгдийг устгах",
    "Delete all",
    "全部删除"
  ],
  "note.delivered": [
    "{done}/{total} самбар хүлээн авсан",
    "{done}/{total} boards received it",
    "{done}/{total} 个大屏已收到"
  ],
  "note.confirmClearTitle": [
    "Бүх тэмдэглэлийг устгах уу?",
    "Delete all notes?",
    "删除所有留言吗？"
  ],
  "note.confirmClearText": [
    "Түүхэнд хадгалагдсан бүх тэмдэглэл устна. Самбар дээр харагдаж буй тэмдэглэл хаагдахгүй.",
    "Every saved note is deleted from the history. A note that is already on a board stays open there.",
    "历史记录中的所有留言都会被删除。已经显示在大屏上的留言不会被关闭。"
  ],
  "note.errAuth": [
    "Нэвтрэх хугацаа дууссан байж магадгүй. Хуудсаа дахин ачаална уу.",
    "Your session may have expired. Reload the page.",
    "登录可能已过期，请刷新页面。"
  ],
  "note.errNetwork": [
    "Сүлжээний алдаа. Холболтоо шалгаад дахин оролдоно уу.",
    "Network error. Check your connection and try again.",
    "网络错误，请检查网络后重试。"
  ],
  "note.errServer": [
    "Серверийн алдаа. Түр хүлээгээд дахин оролдоно уу.",
    "Server error. Wait a moment and try again.",
    "服务器错误，请稍候再试。"
  ],
  "note.errRate": [
    "Хэт олон тэмдэглэл илгээлээ. Нэг минут хүлээгээд дахин оролдоно уу.",
    "Too many notes sent. Wait a minute and try again.",
    "发送的留言过多，请等待一分钟后再试。"
  ],
  "note.errTooLong": [
    "Тэмдэглэл хэт урт байна.",
    "The note is too long.",
    "留言太长。"
  ],
  "note.errEmpty": [
    "Тэмдэглэлийн текст оруулна уу.",
    "Enter the text of the note.",
    "请输入留言内容。"
  ],
  "note.errTitleLong": [
    "Гарчиг хэт урт байна.",
    "The title is too long.",
    "标题太长。"
  ],
  "note.errGone": [
    "Тэмдэглэл олдсонгүй. Жагсаалтыг шинэчиллээ.",
    "The note was not found. The list has been refreshed.",
    "找不到该留言，列表已刷新。"
  ],
  "note.errGeneric": [
    "Үйлдэл амжилтгүй боллоо. Дахин оролдоно уу.",
    "The action failed. Try again.",
    "操作失败，请重试。"
  ],
  "note.board.teacher": [
    "Багш",
    "Teacher",
    "老师"
  ],
  "note.close": [
    "Хаах",
    "Close",
    "关闭"
  ],
  "note.closeReady": [
    "Одоо хаах боломжтой.",
    "You can close it now.",
    "现在可以关闭了。"
  ],
  "nav.files": [
    "Файлууд",
    "Files",
    "文件"
  ],
  "board.menu": [
    "Цэс",
    "Menu",
    "菜单"
  ],
  "board.menuTitle": [
    "Самбарын цэс",
    "Board menu",
    "白板菜单"
  ],
  "board.boards": [
    "Самбарууд",
    "Boards",
    "白板列表"
  ],
  "board.clock": [
    "Цаг",
    "Clock",
    "时钟"
  ],
  "board.close": [
    "Хаах",
    "Close",
    "关闭"
  ],
  "board.list": [
    "Жагсаалт",
    "Pages",
    "页面列表"
  ],
  "board.newShort": [
    "Шинэ",
    "New",
    "新页"
  ],
  "board.prevShort": [
    "Өмнөх",
    "Prev",
    "上一页"
  ],
  "board.nextShort": [
    "Дараах",
    "Next",
    "下一页"
  ],
  "board.pageOf": [
    "Хуудас {n} / {m}",
    "Page {n} of {m}",
    "第 {n} / {m} 页"
  ],
  "board.pagesHeading": [
    "Хуудсууд",
    "Pages",
    "页面"
  ],
  "board.rulerShow": [
    "Шугам харуулах",
    "Show ruler",
    "显示直尺"
  ],
  "board.toolSettings": [
    "Хэрэгслийн тохиргоо",
    "Tool settings",
    "工具设置"
  ],
  "board.viewSettings": [
    "Харагдац ба хуудас",
    "View and page",
    "视图与页面"
  ],
  "board.zoom": [
    "Томруулалт",
    "Zoom",
    "缩放"
  ],
  "board.touchMode": [
    "Хүрэлтийн горим",
    "Touch mode",
    "触控模式"
  ],
  "board.touchDraw": [
    "Бичих",
    "Draw",
    "书写"
  ],
  "board.touchPan": [
    "Хөдөлгөх",
    "Move",
    "移动"
  ],
  "board.touchHint": [
    "Хуруугаар зурах эсвэл хөдөлгөх. Үзэг үргэлж зурна.",
    "Your finger either draws or moves the paper. The stylus always draws.",
    "手指可书写或移动画布，手写笔始终书写。"
  ],
  "board.exitFullscreen": [
    "Бүтэн дэлгэцээс гарах",
    "Exit full screen",
    "退出全屏"
  ],
  "board.backToSite": [
    "Сайт руу буцах",
    "Back to the site",
    "返回网站"
  ],
  "board.fillScreen": [
    "Самбарыг дэлгэц дүүрэн болгох",
    "Fill the screen with the board",
    "白板铺满屏幕"
  ],
  "board.fullscreenFail": [
    "Бүтэн дэлгэц нээгдсэнгүй. Дахин оролдоно уу.",
    "Full screen did not open. Please try again.",
    "未能进入全屏，请重试。"
  ],
  "board.openFailed": [
    "Самбарыг нээж чадсангүй",
    "The board could not be opened",
    "无法打开白板"
  ],
  "files.type.fileSuffix": [
    "файл",
    "file",
    "文件"
  ],
  "files.err.nameEmpty": [
    "Нэрээ оруулна уу",
    "Enter a name",
    "请输入名称"
  ],
  "files.err.nameBad": [
    "Нэр буруу байна",
    "Invalid name",
    "名称无效"
  ],
  "files.err.nameChars": [
    "Нэрэнд / \\ : * ? \" < > | тэмдэгт байж болохгүй",
    "The name cannot contain / \\ : * ? \" < > |",
    "名称不能包含 / \\ : * ? \" < > |"
  ],
  "files.err.nameDot": [
    "Нэр цэг эсвэл зайгаар төгсөж болохгүй",
    "The name cannot end with a dot or a space",
    "名称不能以点或空格结尾"
  ],
  "files.err.nameReserved": [
    "Энэ нэрийг систем ашигладаг тул сонгох боломжгүй",
    "This name is reserved by the system",
    "该名称为系统保留名称"
  ],
  "files.err.nameLong": [
    "Нэр хэт урт байна",
    "The name is too long",
    "名称太长"
  ],
  "files.src.class": [
    "Ангийн хавтаснууд",
    "Class folders",
    "班级文件夹"
  ],
  "files.src.picked": [
    "Сонгосон файлууд",
    "Picked files",
    "已选文件"
  ],
  "files.err.slow": [
    "Серверийн хариу удаж байна. Дахин оролдоно уу.",
    "The server is responding slowly. Please try again.",
    "服务器响应缓慢，请重试。"
  ],
  "files.err.network": [
    "Сүлжээний алдаа. Интернэт холболтоо шалгана уу.",
    "Network error. Check your internet connection.",
    "网络错误，请检查网络连接。"
  ],
  "files.err.server": [
    "Серверийн алдаа ({code})",
    "Server error ({code})",
    "服务器错误（{code}）"
  ],
  "files.err.tooBig": [
    "Файл {max}-аас том байна",
    "The file is larger than {max}",
    "文件超过 {max}"
  ],
  "files.err.sizeMismatch": [
    "Файлын хэмжээ таарахгүй байна. Дахин оролдоно уу.",
    "File size does not match. Please try again.",
    "文件大小不一致，请重试。"
  ],
  "files.err.exists": [
    "Ижил нэртэй зүйл байна",
    "An item with this name already exists",
    "已存在同名项目"
  ],
  "files.err.renameDir": [
    "Энэ хөтөч хавтасны нэрийг солиж чадахгүй байна",
    "This browser cannot rename folders",
    "此浏览器无法重命名文件夹"
  ],
  "files.err.gone": [
    "Энэ хавтас олдсонгүй",
    "This folder was not found",
    "找不到此文件夹"
  ],
  "files.err.intoSelf": [
    "Хавтсыг өөрийнх нь дотор хуулах боломжгүй",
    "A folder cannot be copied into itself",
    "不能把文件夹复制到它自己里面"
  ],
  "files.err.dirBlocks": [
    "Ижил нэртэй хавтас байна",
    "A folder with this name exists",
    "已存在同名文件夹"
  ],
  "files.status.gone": [
    "Салсан",
    "Disconnected",
    "已断开"
  ],
  "files.status.prompt": [
    "Зөвшөөрөл хэрэгтэй",
    "Permission needed",
    "需要授权"
  ],
  "files.status.ok": [
    "Холбогдсон",
    "Connected",
    "已连接"
  ],
  "files.forget": [
    "Мартах",
    "Forget",
    "忘记"
  ],
  "files.forgetNamed": [
    "«{name}»-ийг мартах",
    "Forget \"{name}\"",
    "忘记“{name}”"
  ],
  "files.home": [
    "Нүүр",
    "Home",
    "首页"
  ],
  "files.src.device": [
    "Энэ төхөөрөмж",
    "This device",
    "本设备"
  ],
  "files.src.none": [
    "Одоогоор байхгүй",
    "None yet",
    "暂无"
  ],
  "files.src.pickedGroup": [
    "Сонгосон",
    "Picked",
    "已选"
  ],
  "files.mode.fsa": [
    "Энэ хөтөч төхөөрөмж болон USB-ийн хавтсыг шууд нээж, файл нэмэх, нэр солих, хуулах, устгах боломжтой.",
    "This browser can open folders on this device and on USB drives directly: add files, rename, copy and delete.",
    "此浏览器可直接打开本设备和 U 盘中的文件夹：添加文件、重命名、复制、删除。"
  ],
  "files.mode.input": [
    "Энэ хөтөч (Android Chrome, Firefox, Safari) хавтсыг шууд нээж чадахгүй тул «Файл сонгох» горимоор ажиллана: сонгосон файлыг үзэх, татах, серверт хуулах боломжтой (зөвхөн унших).",
    "This browser (Android Chrome, Firefox, Safari) cannot open folders directly, so it works in \"Pick files\" mode: you can view, download and copy the picked files to the server (read-only).",
    "此浏览器（安卓 Chrome、Firefox、Safari）无法直接打开文件夹，因此使用“选择文件”模式：可以查看、下载所选文件并复制到服务器（只读）。"
  ],
  "files.mode.insecure": [
    "Хаяг нь HTTPS биш байж магадгүй.",
    "The address may not be HTTPS.",
    "当前地址可能不是 HTTPS。"
  ],
  "files.usb.hint": [
    "Вэб хуудас USB-г өөрөө таньж, автоматаар нээж чадахгүй: хөтөч нэг удаа заавал сонгуулдаг.",
    "A web page cannot detect a USB drive or open it automatically: the browser always makes you pick it once.",
    "网页无法自动识别或打开 U 盘：浏览器总是要求你手动选择一次。"
  ],
  "files.usb.hintInput": [
    "USB-ээ залгаад «Файл сонгох» товчийг дарна. Андройд дээр системийн цонхонд дотоод санах ой болон USB хоёулаа харагдана.",
    "Plug in the USB drive and press \"Pick files\". On Android the system window shows both internal storage and the USB drive.",
    "插入 U 盘后点击“选择文件”。在安卓上，系统窗口会同时显示内部存储和 U 盘。"
  ],
  "files.usb.title": [
    "USB флаш холбох",
    "Connect a USB flash drive",
    "连接 U 盘"
  ],
  "files.usb.titleInput": [
    "USB эсвэл төхөөрөмжөөс файл сонгох",
    "Pick files from USB or this device",
    "从 U 盘或本设备选择文件"
  ],
  "files.usb.step1": [
    "USB-ээ залгана",
    "Plug in the USB drive",
    "插入 U 盘"
  ],
  "files.usb.step2": [
    "Товчийг дарна",
    "Press the button",
    "点击按钮"
  ],
  "files.usb.step2b": [
    "«Файл сонгох» товчийг дарна",
    "Press \"Pick files\"",
    "点击“选择文件”"
  ],
  "files.usb.step3": [
    "Дискээ сонгоно",
    "Choose the drive",
    "选择磁盘"
  ],
  "files.usb.step3b": [
    "Файлаа сонгоно",
    "Choose your files",
    "选择文件"
  ],
  "files.usb.connect": [
    "USB холбох",
    "Connect USB",
    "连接 U 盘"
  ],
  "files.pickFiles": [
    "Файл сонгох",
    "Pick files",
    "选择文件"
  ],
  "files.pickFolder": [
    "Хавтас сонгох",
    "Pick a folder",
    "选择文件夹"
  ],
  "files.card.class": [
    "Сурагч бүрийн нууц үгтэй хавтас",
    "A password-protected folder for each student",
    "每位同学一个带密码的文件夹"
  ],
  "files.device.open": [
    "Төхөөрөмжөөс нээх",
    "Open from this device",
    "从本设备打开"
  ],
  "files.pickMedia": [
    "Медиа, PDF сонгох",
    "Pick media, PDF",
    "选择媒体、PDF"
  ],
  "files.card.device": [
    "Дотоод санах ойн хавтас сонгоно",
    "Pick a folder from internal storage",
    "选择内部存储中的文件夹"
  ],
  "files.card.media": [
    "Дуу, видео, зураг, PDF файл",
    "Audio, video, images, PDF files",
    "音频、视频、图片、PDF 文件"
  ],
  "files.card.picked": [
    "{n} файл · зөвхөн унших",
    "{n} files · read-only",
    "{n} 个文件 · 只读"
  ],
  "files.recent": [
    "Сүүлд ашигласан",
    "Recently used",
    "最近使用"
  ],
  "files.regrant": [
    "Дахин зөвшөөрөх",
    "Grant again",
    "重新授权"
  ],
  "files.openIt": [
    "Нээх",
    "Open",
    "打开"
  ],
  "files.crumbMore": [
    "Завсрын хавтсууд",
    "Intermediate folders",
    "中间文件夹"
  ],
  "files.locked": [
    "Нууц үгтэй",
    "Password protected",
    "有密码"
  ],
  "files.unlocked": [
    "Нээлттэй",
    "Open",
    "已解锁"
  ],
  "files.banner.readonly": [
    "Зөвхөн унших горим: сонгосон файлыг үзэх, татах, серверт хуулах боломжтой. Нэр солих, устгах боломжгүй.",
    "Read-only mode: you can view, download and copy the selected files to the server. Renaming and deleting are not possible.",
    "只读模式：可以查看、下载所选文件并复制到服务器，不能重命名或删除。"
  ],
  "files.banner.readonlyDev": [
    "Зөвхөн унших эрхтэй нээгдсэн байна. Өөрчлөхийн тулд дахин зөвшөөрөл өгнө үү.",
    "Opened with read-only access. Grant permission again to make changes.",
    "当前仅有只读权限。请重新授权后再修改。"
  ],
  "files.loading": [
    "Ачаалж байна…",
    "Loading…",
    "加载中…"
  ],
  "files.empty": [
    "Энэ хавтас хоосон байна",
    "This folder is empty",
    "此文件夹为空"
  ],
  "files.emptyHint": [
    "Файл нэмэх товчийг дарах эсвэл файлаа энд чирж оруулна уу.",
    "Press \"Add files\" or drag your files here.",
    "点击“添加文件”或把文件拖到这里。"
  ],
  "files.add": [
    "Файл нэмэх",
    "Add files",
    "添加文件"
  ],
  "files.noMatch": [
    "Илэрц олдсонгүй",
    "No results found",
    "没有找到结果"
  ],
  "files.noMatchHint": [
    "Өөр нэрээр хайж үзнэ үү.",
    "Try a different name.",
    "试试其他名称。"
  ],
  "files.clearFilter": [
    "Шүүлтийг арилгах",
    "Clear filter",
    "清除筛选"
  ],
  "files.usb.disconnected": [
    "USB салгагдсан байна",
    "USB disconnected",
    "U 盘已断开"
  ],
  "files.disconnected": [
    "Байршил олдсонгүй",
    "Location not found",
    "找不到该位置"
  ],
  "files.usb.disconnectedHint": [
    "USB-ээ дахин залгаад «Дахин оролдох» товчийг дарна уу. Хөтөч дахин зөвшөөрөл асууж магадгүй.",
    "Plug the USB drive back in and press \"Try again\". The browser may ask for permission again.",
    "请重新插入 U 盘并点击“重试”。浏览器可能会再次请求权限。"
  ],
  "files.retry": [
    "Дахин оролдох",
    "Try again",
    "重试"
  ],
  "files.toHome": [
    "Нүүр хуудас",
    "Home page",
    "首页"
  ],
  "files.perm.title": [
    "Зөвшөөрөл хэрэгтэй",
    "Permission needed",
    "需要授权"
  ],
  "files.perm.text": [
    "Хөтөч энэ хавтсыг нээхийн тулд дахин зөвшөөрөл асууна.",
    "The browser will ask for permission again to open this folder.",
    "浏览器会再次请求权限以打开此文件夹。"
  ],
  "files.err.title": [
    "Алдаа гарлаа",
    "An error occurred",
    "发生错误"
  ],
  "files.sort.desc": [
    "Буурах дарааллаар",
    "Descending",
    "降序"
  ],
  "files.sort.asc": [
    "Өсөх дарааллаар",
    "Ascending",
    "升序"
  ],
  "files.pickMore": [
    "Дахин сонгох",
    "Pick more",
    "继续选择"
  ],
  "files.selected": [
    "{n} сонгосон",
    "{n} selected",
    "已选 {n} 项"
  ],
  "files.count": [
    "{n} зүйл",
    "{n} items",
    "{n} 项"
  ],
  "files.ofAll": [
    "{n} дотроос",
    "of {n}",
    "共 {n} 项"
  ],
  "files.err.notfound": [
    "Файл эсвэл хавтас олдсонгүй (USB салсан байж болзошгүй).",
    "File or folder not found (the USB drive may have been removed).",
    "找不到文件或文件夹（U 盘可能已被拔出）。"
  ],
  "files.err.denied": [
    "Хөтөч зөвшөөрөл өгөөгүй байна.",
    "The browser has not granted permission.",
    "浏览器未授予权限。"
  ],
  "files.err.full": [
    "Дискний зай хүрэлцэхгүй байна.",
    "Not enough disk space.",
    "磁盘空间不足。"
  ],
  "files.err.busy": [
    "Файлыг өөр програм ашиглаж байна эсвэл өөрчлөх эрхгүй.",
    "The file is in use by another program or cannot be changed.",
    "文件正被其他程序使用或无权修改。"
  ],
  "files.err.stale": [
    "Файл өөрчлөгдсөн байна. Шинэчлээд дахин оролдоно уу.",
    "The file has changed. Refresh and try again.",
    "文件已更改，请刷新后重试。"
  ],
  "files.err.generic": [
    "Алдаа гарлаа",
    "Something went wrong",
    "出错了"
  ],
  "files.usb.connected": [
    "USB холбогдлоо",
    "USB connected",
    "U 盘已连接"
  ],
  "files.usb.removed": [
    "USB салгагдлаа",
    "USB disconnected",
    "U 盘已拔出"
  ],
  "files.picker.denied": [
    "Энэ хавтсыг нээж чадсангүй",
    "This folder could not be opened",
    "无法打开此文件夹"
  ],
  "files.picker.deniedUsb": [
    "Хөтөч системийн болон хувийн хавтас, дискийг бүхэлд нь нээхийг зөвшөөрдөггүй. USB-ийн үндсэн хавтас эсвэл доторх дэд хавтсыг сонгоно уу.",
    "The browser does not allow opening system or private folders or whole drives. Pick the root folder of the USB drive or a subfolder inside it.",
    "浏览器不允许打开系统文件夹、隐私文件夹或整个磁盘。请选择 U 盘的根文件夹或其中的子文件夹。"
  ],
  "files.picker.deniedDev": [
    "Хөтөч системийн болон хувийн хавтас, дискийг бүхэлд нь нээхийг зөвшөөрдөггүй. Доторх дэд хавтсыг сонгоно уу.",
    "The browser does not allow opening system or private folders or whole drives. Pick a subfolder inside.",
    "浏览器不允许打开系统文件夹、隐私文件夹或整个磁盘。请选择其中的子文件夹。"
  ],
  "files.ok": [
    "Ойлголоо",
    "Got it",
    "知道了"
  ],
  "files.forgetPicked": [
    "Сонгосон файлуудын жагсаалтыг цэвэрлэх үү?",
    "Clear the list of selected files?",
    "清空已选文件列表吗？"
  ],
  "files.forgetPickedText": [
    "Файлууд устахгүй, зөвхөн энэ жагсаалтаас хасагдана.",
    "The files are not deleted, only removed from this list.",
    "文件不会被删除，只是从此列表中移除。"
  ],
  "files.forgetTitle": [
    "«{name}»-ийг мартах уу?",
    "Forget \"{name}\"?",
    "要忘记“{name}”吗？"
  ],
  "files.forgetText": [
    "Зөвхөн энэ төхөөрөмж дээрх сануулга устна. Файлууд устахгүй.",
    "Only the shortcut on this device is removed. Your files are not deleted.",
    "只会移除本设备上的记录，文件不会被删除。"
  ],
  "files.forgotten": [
    "Мартлаа",
    "Forgotten",
    "已忘记"
  ],
  "files.picked": [
    "{n} файл сонгогдлоо",
    "{n} files picked",
    "已选择 {n} 个文件"
  ],
  "files.pin.back": [
    "Арилгах",
    "Delete",
    "删除"
  ],
  "files.pin.text": [
    "Хавтасны 4 оронтой нууц үгээ оруулна уу.",
    "Enter the 4-digit password of the folder.",
    "请输入文件夹的 4 位密码。"
  ],
  "files.pin.label": [
    "4 оронтой нууц үг",
    "4-digit password",
    "4 位密码"
  ],
  "files.cancel": [
    "Цуцлах",
    "Cancel",
    "取消"
  ],
  "files.pin.checking": [
    "Шалгаж байна…",
    "Checking…",
    "验证中…"
  ],
  "files.pin.opened": [
    "Нээгдлээ",
    "Unlocked",
    "已解锁"
  ],
  "files.pin.wrong": [
    "Нууц үг буруу байна. Дахин оролдоно уу.",
    "Wrong password. Please try again.",
    "密码错误，请重试。"
  ],
  "files.locked.done": [
    "Хавтас түгжигдлээ",
    "Folder locked",
    "文件夹已锁定"
  ],
  "files.noViewer": [
    "Энэ файлыг нээх боломжгүй тул татаж авлаа.",
    "This file cannot be opened here, so it was downloaded.",
    "无法在此打开该文件，已改为下载。"
  ],
  "files.dl.none": [
    "Татах файл сонгоогүй байна.",
    "No files selected to download.",
    "没有选择要下载的文件。"
  ],
  "files.dl.skipDirs": [
    "Хавтсыг татах боломжгүй: зөвхөн файлууд татагдана.",
    "Folders cannot be downloaded: only files will be downloaded.",
    "无法下载文件夹：仅下载文件。"
  ],
  "files.saved": [
    "«{name}» хадгалагдлаа",
    "\"{name}\" saved",
    "已保存“{name}”"
  ],
  "files.newFolder": [
    "Шинэ хавтас",
    "New folder",
    "新建文件夹"
  ],
  "files.folderName": [
    "Хавтасны нэр",
    "Folder name",
    "文件夹名称"
  ],
  "files.newFolderName": [
    "Шинэ хавтас",
    "New folder",
    "新建文件夹"
  ],
  "files.create": [
    "Үүсгэх",
    "Create",
    "创建"
  ],
  "files.created": [
    "«{name}» хавтас үүслээ",
    "Folder \"{name}\" created",
    "已创建文件夹“{name}”"
  ],
  "files.rename.title": [
    "Нэр солих",
    "Rename",
    "重命名"
  ],
  "files.rename.label": [
    "Шинэ нэр",
    "New name",
    "新名称"
  ],
  "files.rename": [
    "Нэр солих",
    "Rename",
    "重命名"
  ],
  "files.renamed": [
    "Нэр солигдлоо",
    "Renamed",
    "已重命名"
  ],
  "files.del.one": [
    "«{name}» устгагдана.",
    "\"{name}\" will be deleted.",
    "将删除“{name}”。"
  ],
  "files.del.many": [
    "{n} зүйл устгагдана.",
    "{n} items will be deleted.",
    "将删除 {n} 项。"
  ],
  "files.del.recursive": [
    "Хавтас доторх бүх зүйлтэй нь устна.",
    "Folders are deleted together with everything inside.",
    "文件夹将连同其中所有内容一起删除。"
  ],
  "files.del.undo": [
    "Үүнийг буцаах боломжгүй.",
    "This cannot be undone.",
    "此操作无法撤销。"
  ],
  "files.del.title": [
    "Устгах уу?",
    "Delete?",
    "要删除吗？"
  ],
  "files.delete": [
    "Устгах",
    "Delete",
    "删除"
  ],
  "files.deleted": [
    "{n} зүйл устгагдлаа",
    "{n} items deleted",
    "已删除 {n} 项"
  ],
  "files.move.title": [
    "Зөөх үү?",
    "Move?",
    "要移动吗？"
  ],
  "files.move.text": [
    "Файлууд «{dest}»-д хуулагдсаны дараа анхны байрлалаас устна.",
    "After the files are copied to \"{dest}\" they are removed from their original location.",
    "文件复制到“{dest}”后，将从原位置删除。"
  ],
  "files.cut.go": [
    "Зөөх",
    "Move",
    "移动"
  ],
  "files.err.noWrite": [
    "Энэ байршилд файл нэмэх боломжгүй.",
    "Files cannot be added to this location.",
    "无法向此位置添加文件。"
  ],
  "files.yes": [
    "Тийм",
    "Yes",
    "是"
  ],
  "files.conflict.title": [
    "Ижил нэртэй зүйл байна",
    "An item with this name already exists",
    "已存在同名项目"
  ],
  "files.conflict.text": [
    "«{name}» нэртэй зүйл «{dest}» дотор аль хэдийн байна.",
    "An item named \"{name}\" already exists in \"{dest}\".",
    "“{dest}”中已存在名为“{name}”的项目。"
  ],
  "files.conflict.all": [
    "Үлдсэн бүгдэд хэрэглэх",
    "Apply to all remaining",
    "应用于其余全部"
  ],
  "files.conflict.skip": [
    "Алгасах",
    "Skip",
    "跳过"
  ],
  "files.conflict.keep": [
    "Хоёуланг нь үлдээх",
    "Keep both",
    "两者都保留"
  ],
  "files.conflict.replace": [
    "Солих",
    "Replace",
    "替换"
  ],
  "files.xfer.stop": [
    "Бүгдийг цуцлах",
    "Cancel everything",
    "全部取消"
  ],
  "files.props": [
    "Мэдээлэл",
    "Properties",
    "属性"
  ],
  "files.props.name": [
    "Нэр",
    "Name",
    "名称"
  ],
  "files.props.type": [
    "Төрөл",
    "Type",
    "类型"
  ],
  "files.type.folder": [
    "Хавтас",
    "Folder",
    "文件夹"
  ],
  "files.props.count": [
    "Дотор",
    "Contents",
    "内容"
  ],
  "files.props.path": [
    "Байрлал",
    "Location",
    "位置"
  ],
  "files.props.size": [
    "Хэмжээ",
    "Size",
    "大小"
  ],
  "files.props.calc": [
    "Тооцоолох",
    "Calculate",
    "计算"
  ],
  "files.props.bytes": [
    "байт",
    "bytes",
    "字节"
  ],
  "files.props.modified": [
    "Өөрчилсөн",
    "Modified",
    "修改时间"
  ],
  "files.props.source": [
    "Эх сурвалж",
    "Source",
    "来源"
  ],
  "files.props.many": [
    "{n} зүйл",
    "{n} items",
    "{n} 项"
  ],
  "files.props.folders": [
    "Хавтас",
    "Folders",
    "文件夹"
  ],
  "files.props.files": [
    "Файл",
    "Files",
    "文件"
  ],
  "files.close": [
    "Хаах",
    "Close",
    "关闭"
  ],
  "files.props.counting": [
    "{files} файл · {size}…",
    "{files} files · {size}…",
    "{files} 个文件 · {size}…"
  ],
  "files.props.total": [
    "{files} файл, {dirs} хавтас · {size}",
    "{files} files, {dirs} folders · {size}",
    "{files} 个文件，{dirs} 个文件夹 · {size}"
  ],
  "files.xfer.queued": [
    "Дараалалд байна…",
    "Waiting in queue…",
    "排队中…"
  ],
  "files.xfer.progress": [
    "{n} файл дууссан",
    "{n} files done",
    "已完成 {n} 个文件"
  ],
  "files.xfer.cancelled": [
    "Цуцаллаа",
    "Cancelled",
    "已取消"
  ],
  "files.xfer.partial": [
    "{n} файл амжилттай, {f} алдаатай",
    "{n} files succeeded, {f} failed",
    "{n} 个成功，{f} 个失败"
  ],
  "files.xfer.finished": [
    "Дууслаа",
    "Finished",
    "已完成"
  ],
  "files.open": [
    "Нээх",
    "Open",
    "打开"
  ],
  "files.copy": [
    "Хуулах",
    "Copy",
    "复制"
  ],
  "files.cut": [
    "Таслах",
    "Cut",
    "剪切"
  ],
  "files.pasteInto": [
    "Энэ хавтсанд буулгах",
    "Paste into this folder",
    "粘贴到此文件夹"
  ],
  "files.download": [
    "Татах",
    "Download",
    "下载"
  ],
  "files.saveAs": [
    "Хадгалах…",
    "Save as…",
    "另存为…"
  ],
  "files.paste": [
    "Буулгах",
    "Paste",
    "粘贴"
  ],
  "files.selectAll": [
    "Бүгдийг сонгох",
    "Select all",
    "全选"
  ],
  "files.refresh": [
    "Шинэчлэх",
    "Refresh",
    "刷新"
  ],
  "files.places": [
    "Байршил",
    "Places",
    "位置"
  ],
  "files.nav.label": [
    "Явах",
    "Navigate",
    "导航"
  ],
  "files.nav.back": [
    "Буцах",
    "Back",
    "后退"
  ],
  "files.nav.forward": [
    "Урагш",
    "Forward",
    "前进"
  ],
  "files.nav.up": [
    "Нэг түвшин дээш",
    "Up one level",
    "上一级"
  ],
  "files.nav.path": [
    "Хавтасны зам",
    "Folder path",
    "文件夹路径"
  ],
  "files.search.label": [
    "Файлаар шүүх",
    "Filter files",
    "筛选文件"
  ],
  "files.search.placeholder": [
    "Нэрээр шүүх…",
    "Filter by name…",
    "按名称筛选…"
  ],
  "files.actions.label": [
    "Үйлдлүүд",
    "Actions",
    "操作"
  ],
  "files.lockFolder": [
    "Түгжих",
    "Lock",
    "锁定"
  ],
  "files.selectMode": [
    "Сонгох",
    "Select",
    "选择"
  ],
  "files.sort.label": [
    "Эрэмбэлэх",
    "Sort by",
    "排序方式"
  ],
  "files.sort.name": [
    "Нэр",
    "Name",
    "名称"
  ],
  "files.sort.date": [
    "Огноо",
    "Date",
    "日期"
  ],
  "files.sort.size": [
    "Хэмжээ",
    "Size",
    "大小"
  ],
  "files.sort.type": [
    "Төрөл",
    "Type",
    "类型"
  ],
  "files.sort.dir": [
    "Эрэмбийн чиглэл",
    "Sort direction",
    "排序方向"
  ],
  "files.view.label": [
    "Харагдах байдал",
    "View",
    "视图"
  ],
  "files.view.list": [
    "Жагсаалт",
    "List",
    "列表"
  ],
  "files.view.grid": [
    "Тор",
    "Grid",
    "网格"
  ],
  "files.sel.label": [
    "Сонгосон зүйлс",
    "Selected items",
    "已选项目"
  ],
  "files.clearSel": [
    "Сонголт арилгах",
    "Clear selection",
    "取消选择"
  ],
  "files.list.label": [
    "Файлууд",
    "Files",
    "文件"
  ],
  "files.dropHere": [
    "Файлаа энд тавина уу",
    "Drop your files here",
    "把文件拖到这里"
  ],
  "files.xfer.label": [
    "Хуулалтын явц",
    "Transfer progress",
    "传输进度"
  ],
  "files.type.pdf": [
    "PDF баримт",
    "PDF document",
    "PDF 文档"
  ],
  "files.type.audio": [
    "Дууны файл",
    "Audio file",
    "音频文件"
  ],
  "files.type.video": [
    "Видео",
    "Video",
    "视频"
  ],
  "files.type.image": [
    "Зураг",
    "Image",
    "图片"
  ],
  "files.type.text": [
    "Текст",
    "Text",
    "文本"
  ],
  "files.type.file": [
    "Файл",
    "File",
    "文件"
  ],
  "files.xfer.adding": [
    "«{dest}» руу файл нэмж байна",
    "Adding files to \"{dest}\"",
    "正在向“{dest}”添加文件"
  ],
  "files.xfer.moving": [
    "«{dest}» руу зөөж байна",
    "Moving to \"{dest}\"",
    "正在移动到“{dest}”"
  ],
  "files.xfer.copying": [
    "«{dest}» руу хуулж байна",
    "Copying to \"{dest}\"",
    "正在复制到“{dest}”"
  ],
  "files.xfer.doneAdd": [
    "{n} файл нэмэгдлээ",
    "{n} files added",
    "已添加 {n} 个文件"
  ],
  "files.xfer.doneMove": [
    "{n} файл зөөгдлөө",
    "{n} files moved",
    "已移动 {n} 个文件"
  ],
  "files.xfer.doneCopy": [
    "{n} файл хуулагдлаа",
    "{n} files copied",
    "已复制 {n} 个文件"
  ],
  "files.clip.cut": [
    "{n} зүйл таслагдлаа. Зорилтот хавтсанд очоод «Буулгах»-ыг дарна уу.",
    "{n} items cut. Go to the destination folder and press \"Paste\".",
    "已剪切 {n} 项。请打开目标文件夹并点击“粘贴”。"
  ],
  "files.clip.copied": [
    "{n} зүйл хуулагдлаа. Зорилтот хавтсанд очоод «Буулгах»-ыг дарна уу.",
    "{n} items copied. Go to the destination folder and press \"Paste\".",
    "已复制 {n} 项。请打开目标文件夹并点击“粘贴”。"
  ],
  "fv.audio.err": [
    "Энэ аудиог хөтөч тоглуулж чадсангүй.",
    "This browser could not play this audio.",
    "浏览器无法播放此音频。"
  ],
  "fv.back10": [
    "10 секунд ухраах",
    "Back 10 seconds",
    "后退 10 秒"
  ],
  "fv.close": [
    "Хаах",
    "Close",
    "关闭"
  ],
  "fv.closeList": [
    "Жагсаалтыг хаах",
    "Close playlist",
    "关闭播放列表"
  ],
  "fv.download": [
    "Татах",
    "Download",
    "下载"
  ],
  "fv.err.load": [
    "Файлыг ачаалж чадсангүй.",
    "Could not load the file.",
    "无法加载文件。"
  ],
  "fv.err.unsupported": [
    "Энэ төрлийн файлыг урьдчилан харах боломжгүй. Татаж аваад нээнэ үү.",
    "This type of file cannot be previewed. Download it to open it.",
    "无法预览此类型的文件。请下载后打开。"
  ],
  "fv.exitFullscreen": [
    "Бүтэн дэлгэцээс гарах",
    "Exit full screen",
    "退出全屏"
  ],
  "fv.expand": [
    "Томруулах",
    "Expand",
    "展开"
  ],
  "fv.fullscreen": [
    "Бүтэн дэлгэц",
    "Full screen",
    "全屏"
  ],
  "fv.fwd10": [
    "10 секунд урагшлуулах",
    "Forward 10 seconds",
    "快进 10 秒"
  ],
  "fv.image.tools": [
    "Зургийн хэрэгсэл",
    "Image tools",
    "图片工具"
  ],
  "fv.img.err": [
    "Зургийг харуулж чадсангүй. Файл эвдэрсэн эсвэл дэмжигдээгүй байж болзошгүй.",
    "The image could not be shown. The file may be damaged or unsupported.",
    "无法显示图片。文件可能已损坏或不受支持。"
  ],
  "fv.img.fit": [
    "Дэлгэцэнд тааруулах",
    "Fit to screen",
    "适应屏幕"
  ],
  "fv.img.rotateL": [
    "Зүүн тийш эргүүлэх",
    "Rotate left",
    "向左旋转"
  ],
  "fv.img.rotateR": [
    "Баруун тийш эргүүлэх",
    "Rotate right",
    "向右旋转"
  ],
  "fv.img.zoomIn": [
    "Томруулах",
    "Zoom in",
    "放大"
  ],
  "fv.img.zoomOut": [
    "Жижигрүүлэх",
    "Zoom out",
    "缩小"
  ],
  "fv.loading": [
    "Ачаалж байна…",
    "Loading…",
    "加载中…"
  ],
  "fv.loop": [
    "Давтах",
    "Loop",
    "循环播放"
  ],
  "fv.minimize": [
    "Жижигрүүлэх",
    "Minimize",
    "最小化"
  ],
  "fv.mute": [
    "Дууг хаах",
    "Mute",
    "静音"
  ],
  "fv.nextFile": [
    "Дараах файл",
    "Next file",
    "下一个文件"
  ],
  "fv.nextTrack": [
    "Дараах дуу",
    "Next track",
    "下一首"
  ],
  "fv.nextVideo": [
    "Дараах видео",
    "Next video",
    "下一个视频"
  ],
  "fv.pause": [
    "Түр зогсоох",
    "Pause",
    "暂停"
  ],
  "fv.pdf.broken": [
    "PDF файлыг нээж чадсангүй. Файл эвдэрсэн эсвэл дэмжигдээгүй байж болзошгүй.",
    "The PDF could not be opened. The file may be damaged or unsupported.",
    "无法打开 PDF。文件可能已损坏或不受支持。"
  ],
  "fv.pdf.fitPage": [
    "Хуудсыг бүтнээр харах",
    "Fit whole page",
    "适应整页"
  ],
  "fv.pdf.fitWidth": [
    "Өргөнд тааруулах",
    "Fit width",
    "适应宽度"
  ],
  "fv.pdf.goto": [
    "Хуудас руу очих",
    "Go to page",
    "跳转到页码"
  ],
  "fv.pdf.loading": [
    "PDF ачаалж байна…",
    "Loading PDF…",
    "正在加载 PDF…"
  ],
  "fv.pdf.nextPage": [
    "Дараах хуудас",
    "Next page",
    "下一页"
  ],
  "fv.pdf.noHits": [
    "Олдсонгүй",
    "No results",
    "未找到"
  ],
  "fv.pdf.noPassword": [
    "Нууц үг оруулаагүй тул PDF-ийг нээж чадсангүй.",
    "The PDF could not be opened because no password was entered.",
    "未输入密码，无法打开 PDF。"
  ],
  "fv.pdf.pageN": [
    "Хуудас {n}",
    "Page {n}",
    "第 {n} 页"
  ],
  "fv.pdf.pagesN": [
    "{n} хуудас",
    "{n} pages",
    "共 {n} 页"
  ],
  "fv.pdf.prevPage": [
    "Өмнөх хуудас",
    "Previous page",
    "上一页"
  ],
  "fv.pdf.rotate": [
    "Эргүүлэх",
    "Rotate",
    "旋转"
  ],
  "fv.pdf.search": [
    "Хайх",
    "Search",
    "搜索"
  ],
  "fv.pdf.searchClose": [
    "Хайлтыг хаах",
    "Close search",
    "关闭搜索"
  ],
  "fv.pdf.searchIn": [
    "PDF-ээс хайх",
    "Search in PDF",
    "在 PDF 中搜索"
  ],
  "fv.pdf.searchNext": [
    "Дараах үр дүн",
    "Next result",
    "下一个结果"
  ],
  "fv.pdf.searchPrev": [
    "Өмнөх үр дүн",
    "Previous result",
    "上一个结果"
  ],
  "fv.pdf.thumbs": [
    "Хуудсын жагсаалт",
    "Page thumbnails",
    "页面缩略图"
  ],
  "fv.pdf.zoomIn": [
    "Томруулах",
    "Zoom in",
    "放大"
  ],
  "fv.pdf.zoomOut": [
    "Жижигрүүлэх",
    "Zoom out",
    "缩小"
  ],
  "fv.pdf.zoomReset": [
    "Автомат хэмжээ",
    "Automatic size",
    "自动大小"
  ],
  "fv.pip": [
    "Жижиг цонх",
    "Picture in picture",
    "画中画"
  ],
  "fv.play": [
    "Тоглуулах",
    "Play",
    "播放"
  ],
  "fv.player": [
    "Тоглуулагч",
    "Player",
    "播放器"
  ],
  "fv.playlist": [
    "Жагсаалт",
    "Playlist",
    "播放列表"
  ],
  "fv.prevFile": [
    "Өмнөх файл",
    "Previous file",
    "上一个文件"
  ],
  "fv.prevTrack": [
    "Өмнөх дуу",
    "Previous track",
    "上一首"
  ],
  "fv.prevVideo": [
    "Өмнөх видео",
    "Previous video",
    "上一个视频"
  ],
  "fv.pw.cancel": [
    "Болих",
    "Cancel",
    "取消"
  ],
  "fv.pw.label": [
    "PDF-ийн нууц үг",
    "PDF password",
    "PDF 密码"
  ],
  "fv.pw.lead": [
    "Энэ PDF файлыг нээхийн тулд нууц үгийг оруулна уу.",
    "Enter the password to open this PDF.",
    "请输入密码以打开此 PDF。"
  ],
  "fv.pw.open": [
    "Нээх",
    "Open",
    "打开"
  ],
  "fv.pw.title": [
    "Нууц үгтэй PDF",
    "Password-protected PDF",
    "受密码保护的 PDF"
  ],
  "fv.pw.wrong": [
    "Нууц үг буруу байна. Дахин оролдоно уу.",
    "Wrong password. Please try again.",
    "密码错误，请重试。"
  ],
  "fv.repeatAll": [
    "Бүгдийг давтах",
    "Repeat all",
    "全部循环"
  ],
  "fv.repeatOff": [
    "Давтахгүй",
    "Repeat off",
    "不循环"
  ],
  "fv.repeatOne": [
    "Нэг дууг давтах",
    "Repeat one",
    "单曲循环"
  ],
  "fv.seek": [
    "Байрлал",
    "Seek",
    "进度"
  ],
  "fv.shuffle": [
    "Холих",
    "Shuffle",
    "随机播放"
  ],
  "fv.shuffleOff": [
    "Холих унтраалттай",
    "Shuffle off",
    "随机播放已关闭"
  ],
  "fv.shuffleOn": [
    "Холих асаалттай",
    "Shuffle on",
    "随机播放已开启"
  ],
  "fv.speed": [
    "Хурд: {rate}×",
    "Speed: {rate}×",
    "速度：{rate}×"
  ],
  "fv.subs": [
    "Хадмал",
    "Subtitles",
    "字幕"
  ],
  "fv.subsOff": [
    "Хадмал унтраалттай",
    "Subtitles off",
    "字幕已关闭"
  ],
  "fv.subsOn": [
    "Хадмал асаалттай",
    "Subtitles on",
    "字幕已开启"
  ],
  "fv.text.big": [
    "Энэ текст файл 2 МБ-аас том тул шууд харуулахгүй. Татаж аваад нээнэ үү.",
    "This text file is larger than 2 MB, so it is not shown here. Download it to open it.",
    "此文本文件超过 2 MB，无法在此显示。请下载后打开。"
  ],
  "fv.text.bigger": [
    "Үсгийг томруулах",
    "Larger text",
    "放大字体"
  ],
  "fv.text.copied": [
    "Хууллаа",
    "Copied",
    "已复制"
  ],
  "fv.text.copy": [
    "Бүгдийг хуулах",
    "Copy all",
    "复制全部"
  ],
  "fv.text.copyFail": [
    "Хуулж чадсангүй",
    "Could not copy",
    "复制失败"
  ],
  "fv.text.lines": [
    "{n} мөр",
    "{n} lines",
    "{n} 行"
  ],
  "fv.text.smaller": [
    "Үсгийг жижигрүүлэх",
    "Smaller text",
    "缩小字体"
  ],
  "fv.text.tools": [
    "Текстийн хэрэгсэл",
    "Text tools",
    "文本工具"
  ],
  "fv.text.wrap": [
    "Мөр таслах",
    "Wrap lines",
    "自动换行"
  ],
  "fv.unmute": [
    "Дууг нээх",
    "Unmute",
    "取消静音"
  ],
  "fv.video.codec": [
    "Энэ видеог хөтөч тоглуулж чадсангүй (кодек)",
    "This browser could not play this video (codec)",
    "浏览器无法播放此视频（编解码器）"
  ],
  "fv.video.continue": [
    "Үргэлжлүүлэх",
    "Continue",
    "继续播放"
  ],
  "fv.video.fromStart": [
    "Эхнээс нь",
    "From the start",
    "从头开始"
  ],
  "fv.video.network": [
    "Сүлжээний алдаа гарлаа. Видеог ачаалж чадсангүй.",
    "Network error. The video could not be loaded.",
    "网络错误，无法加载视频。"
  ],
  "fv.video.resume": [
    "Өмнө нь {time} дээр зогссон байна.",
    "You stopped at {time} last time.",
    "上次观看到 {time}。"
  ],
  "fv.video.subs": [
    "Хадмал",
    "Subtitles",
    "字幕"
  ],
  "fv.volume": [
    "Дууны хэмжээ",
    "Volume",
    "音量"
  ],
  "board.savedShort": [
    "Хадгалагдлаа",
    "Saved",
    "已保存"
  ],
  "board.fitFill": [
    "Дэлгэц дүүрэн",
    "Fill screen",
    "铺满屏幕"
  ],
  "fs.back": [
    "Буцах",
    "Back",
    "返回"
  ]
};
  var aliases = {};
  var storageKey = 'c122-language', language = 'mn';
  var locales = { mn: 'mn-MN', en: 'en-US', zh: 'zh-CN' };
  var languages = ['mn', 'en', 'zh'];
  var textRecords = new WeakMap(), attributeRecords = new WeakMap();
  var buttonBound = new WeakSet(), observer = null, queued = new Set(), scheduled = false;
  var attributes = ['placeholder', 'title', 'aria-label', 'alt'];
  var protectedSelectors = [
    '[data-i18n-skip]', '[data-user-content]', '[translate="no"]',
    '.ai-chat-message-content', '.ai-chat-card strong', '.ai-chat-trash-row strong',
    '.ai-chat-message-label > span:first-child', '#aiChatTitle:not([data-i18n])',
    '.folder-card-name', '.folder-card-description', '.folder-file-name', '.folder-directory-name', '.folder-directory-description',
    '#folderTitle', '#folderDescription', '#folderBreadcrumbs', '#sharedFolderTitle', '#sharedFolderDescription', '#sharedFolderBreadcrumbs',
    '.folder-preview-head h3', '.file-editor-title', '.file-editor-name',
    '#doodlePageTitle', '.doodle-page-info h3', '.doodle-page-info p', '#doodleOverlays',
    '#musicNowTitle:not([data-i18n])', '#musicNowArtist:not([data-i18n])', '#musicPlaylistTitle', '#musicPlaylistDescription',
    '#musicPlaylistOwner', '.music-playlist-card strong', '.music-playlist-card > small', '.music-track-copy', '.music-track-art', '.music-trash-row > span',
    '.spotify-track-copy', '.spotify-playlist-copy', '#musicMiniTitle', '#musicMiniArtist', '.music-queue-row strong', '.music-queue-row small', '#ytNowTitle', '#ytNowChannel', '.yt-card-copy', '.yt-queue-copy', '.yt-recent-copy',
    '.pb-saved-card > b', '.pb-saved-card > img',
    '#textbookReaderTitle', '.textbook-card-copy h4', '.textbook-cover-title',
    '.subj', '.lesson-teacher', '.lesson-room', '.lesson-name', '.lesson-meta',
    '.clubs-name', '.clubs-teacher', '.student-clubs-name', '.student-clubs-club-name',
    '.student-clubs-day-card-main h4', '.student-clubs-agenda-info h5', '#clubsTableBody td:nth-child(2)',
    '#studentClubsTitle', '#clubsSchool', '.tile', '.lightbox-caption', '.lb-caption',
    'script', 'style', 'pre', 'code', 'svg', 'math'
  ].join(',');
  var studentSelects = ['aiChatStudent', 'musicStudent', 'studentClubsName', 'textbookStudentPicker', 'studyStudent', 'mirrorStudent'];

  function normalized(value) { return String(value == null ? '' : value).replace(/\s+/g, ' ').trim(); }
  function normalizeLanguage(value) { return value === 'zh-CN' || value === 'zh-Hans' ? 'zh' : value === 'en-US' || value === 'en-GB' ? 'en' : languages.indexOf(value) >= 0 ? value : 'mn'; }
  function interpolate(value, params) {
    return String(value).replace(/\{([A-Za-z0-9_]+)\}/g, function (match, key) { return params && Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match; });
  }
  function localized(value) { return Array.isArray(value) ? value[languages.indexOf(language)] : value; }
  function t(key, fallbackOrParams, paramsOrFallback) {
    var fallback = typeof fallbackOrParams === 'string' ? fallbackOrParams : typeof paramsOrFallback === 'string' ? paramsOrFallback : key;
    var params = fallbackOrParams && typeof fallbackOrParams === 'object' ? fallbackOrParams : paramsOrFallback && typeof paramsOrFallback === 'object' ? paramsOrFallback : null;
    var original = aliases[key] || key;
    var message = Object.prototype.hasOwnProperty.call(messages, key) ? localized(messages[key]) : Object.prototype.hasOwnProperty.call(labels, original) ? language === 'mn' ? original : labels[original][language === 'en' ? 0 : 1] : Object.prototype.hasOwnProperty.call(labels, fallback) ? language === 'mn' ? fallback : labels[fallback][language === 'en' ? 0 : 1] : fallback;
    return interpolate(message, params);
  }
  function skip(element, forText) {
    if (!element || element.nodeType !== 1) return true;
    if (element.closest(protectedSelectors)) return true;
    if (forText && element.closest('textarea,input,[contenteditable]:not([contenteditable="false"])')) return true;
    var option = element.closest('option');
    if (option && option.value !== '' && option.parentElement && studentSelects.indexOf(option.parentElement.id) >= 0) return true;
    return false;
  }
  var patterns = [
    [/^(\d+) сонгосон$/, 'count.selected', ['count']],
    [/^(\d+) дуу$/, 'count.songs', ['count']],
    [/^(\d+) дуу олдлоо\.$/, 'count.songsFound', ['count']],
    [/^(\d+) дурсамж$/, 'count.memories', ['count']],
    [/^(\d+) хуудас$/, 'count.pages', ['count']],
    [/^(\d+) файл$/, 'count.files', ['count']],
    [/^(\d+) зурвас$/, 'count.messages', ['count']],
    [/^(\d+) минут$/, 'count.minutes', ['count']],
    [/^(\d+) мин$/, 'count.minuteShort', ['count']],
    [/^(\d+) ном$/, 'count.books', ['count']],
    [/^(\d+) \/ (\d+) ном$/, 'count.booksTotal', ['count', 'total']],
    [/^(\d+) дугуйлан · (\d+) минут$/, 'count.clubsMinutes', ['count', 'minutes']],
    [/^(\d+) удаа · (\d+) минут$/, 'count.sessionsMinutes', ['count', 'minutes']],
    [/^Нийт (\d+) мин үлдлээ$/, 'count.remainingMinutes', ['count']],
    [/^Нийт (\d+) минут үлдлээ$/, 'count.remainingMinutes', ['count']],
    [/^(\d+) мин (\d+) сек$/, 'count.minutesSeconds', ['minutes', 'seconds']],
    [/^Өнгө (#[0-9A-Fa-f]{3,8})$/, 'ui.colorValue', ['color']],
    [/^Серверийн алдаа \((\d+)\)$/, 'error.serverStatus', ['status']],
    [/^Шууд · багш холбогдсон: (\d+)$/, 'camera.watchers', ['count']]
  ];
  function translateString(value) {
    var original = normalized(value);
    if (Object.prototype.hasOwnProperty.call(labels, original) || Object.prototype.hasOwnProperty.call(messages, original)) return t(original);
    if (language === 'mn') return original;
    for (var i = 0; i < patterns.length; i++) {
      var match = original.match(patterns[i][0]); if (!match) continue;
      var params = {}; patterns[i][2].forEach(function (key, index) { params[key] = match[index + 1]; });
      return t(patterns[i][1], params);
    }
    return original;
  }
  function translateText(node) {
    var parent = node.parentElement;
    if (!parent || skip(parent, true) || parent.closest('[data-i18n]')) return;
    // Club choice titles also contain a separate rank label; preserve only the name text.
    if (parent.matches('.student-clubs-choice h4')) return;
    var current = node.nodeValue, record = textRecords.get(node);
    if (!record || current !== record.last) record = { original: current, last: current };
    var source = record.original, compact = normalized(source), translated = translateString(compact);
    if (compact === '' || translated === compact) {
      if (current !== source && current === record.last) node.nodeValue = source;
      record.last = node.nodeValue; textRecords.set(node, record); return;
    }
    var leading = source.match(/^\s*/)[0], trailing = source.match(/\s*$/)[0];
    var next = leading + translated + trailing;
    if (node.nodeValue !== next) node.nodeValue = next;
    record.last = next; textRecords.set(node, record);
  }
  function translateAttribute(element, attribute) {
    var key = element.getAttribute('data-i18n-' + attribute), current = element.getAttribute(attribute);
    if (current == null && !key) return;
    var records = attributeRecords.get(element) || {}, record = records[attribute];
    if (!record || current !== record.last) record = { original: current || '', last: current || '' };
    var next = key ? t(key, record.original) : translateString(record.original);
    if (current !== next) element.setAttribute(attribute, next);
    record.last = next; records[attribute] = record; attributeRecords.set(element, records);
  }
  function translateElement(element) {
    if (skip(element, false)) return;
    var key = element.getAttribute('data-i18n');
    if (key) {
      var record = textRecords.get(element), current = element.textContent;
      if (!record) record = { original: current, last: current };
      var fallback = element.getAttribute('data-i18n-fallback') || record.original;
      var params = null; try { params = JSON.parse(element.getAttribute('data-i18n-params') || 'null'); } catch (_) {}
      var next = t(key, fallback, params);
      if (current !== next) {
        if (element.children.length === 0) element.textContent = next;
        else {
          // Keep icons and attached listeners when a button contains a translated text node.
          var text = Array.prototype.find.call(element.childNodes, function (node) { return node.nodeType === 3 && normalized(node.nodeValue); });
          if (text) text.nodeValue = next;
        }
      }
      record.last = element.textContent; textRecords.set(element, record);
    }
    attributes.forEach(function (attribute) { translateAttribute(element, attribute); });
  }
  function translate(root) {
    root = root || document;
    if (root.nodeType === 3) { translateText(root); return; }
    if (root.nodeType === 1) translateElement(root);
    if (root.querySelectorAll) Array.prototype.forEach.call(root.querySelectorAll('[data-i18n],[placeholder],[title],[aria-label],[alt]'), translateElement);
    var walker = document.createTreeWalker(root, 4), node;
    while ((node = walker.nextNode())) translateText(node);
    bindButton();
  }
  function updateDays() {
    if (window.C122) window.C122.DAYS = ['', t('Даваа'), t('Мягмар'), t('Лхагва'), t('Пүрэв'), t('Баасан'), t('Бямба'), t('Ням')];
  }
  function updateButton() {
    var button = document.getElementById('siteLanguageButton'); if (!button) return;
    var text = language === 'zh' ? '中文' : language.toUpperCase();
    var label = button.querySelector('[data-language-label]') || button;
    if (label.textContent !== text) label.textContent = text;
    button.setAttribute('lang', language === 'zh' ? 'zh-CN' : language);
    button.setAttribute('aria-label', t('language.switch'));
    button.setAttribute('title', t('language.switch'));
    button.setAttribute('data-language', language);
  }
  function bindButton() {
    var button = document.getElementById('siteLanguageButton'); if (!button || buttonBound.has(button)) return;
    buttonBound.add(button); button.addEventListener('click', function () { cycle(); }); updateButton();
  }
  function emit() { document.dispatchEvent(new CustomEvent('c122:language', { detail: { language: language, locale: locales[language] } })); }
  function setLanguage(value, options) {
    language = normalizeLanguage(value); document.documentElement.lang = locales[language] === 'zh-CN' ? 'zh-CN' : language;
    try { localStorage.setItem(storageKey, language); } catch (_) {}
    updateDays(); translate(document); updateButton();
    if (!options || options.emit !== false) emit();
    return language;
  }
  function cycle() { return setLanguage(languages[(languages.indexOf(language) + 1) % languages.length]); }
  function formatDate(value, options) {
    var date = value instanceof Date ? value : new Date(typeof value === 'number' && value < 100000000000 ? value * 1000 : value);
    try { return new Intl.DateTimeFormat(locales[language], Object.assign({ timeZone: 'Asia/Ulaanbaatar' }, options || {})).format(date); } catch (_) { return String(value == null ? '' : value); }
  }
  function formatNumber(value, options) { try { return new Intl.NumberFormat(locales[language], options || {}).format(value); } catch (_) { return String(value); } }
  function queue(root) {
    if (!root || !root.isConnected && root !== document) return;
    queued.add(root); if (scheduled) return; scheduled = true;
    (window.requestAnimationFrame || function (fn) { return setTimeout(fn, 0); })(function () {
      scheduled = false; var roots = Array.from(queued); queued.clear();
      if (roots.length > 60) translate(document.body || document);
      else roots.forEach(function (item) { if (item.isConnected) translate(item); });
    });
  }
  function observe() {
    if (observer || !window.MutationObserver) return;
    observer = new MutationObserver(function (records) {
      records.forEach(function (record) {
        if (record.type === 'characterData') { var saved = textRecords.get(record.target); if (!saved || record.target.nodeValue !== saved.last) queue(record.target); }
        else if (record.type === 'attributes') { var attributesForNode = attributeRecords.get(record.target), savedAttribute = attributesForNode && attributesForNode[record.attributeName]; if (!savedAttribute || record.target.getAttribute(record.attributeName) !== savedAttribute.last) queue(record.target); }
        else Array.prototype.forEach.call(record.addedNodes, function (node) { if (node.nodeType === 1 || node.nodeType === 3) queue(node); });
      });
    });
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: attributes.concat(['data-i18n', 'data-i18n-params', 'data-i18n-placeholder', 'data-i18n-title', 'data-i18n-aria-label', 'data-i18n-alt']) });
  }
  try { language = normalizeLanguage(localStorage.getItem(storageKey) || 'mn'); } catch (_) {}
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : language;
  window.C122I18n = { t: t, setLanguage: setLanguage, cycle: cycle, language: function () { return language; }, locale: function () { return locales[language]; }, translate: translate, formatDate: formatDate, formatNumber: formatNumber, weekdays: function () { return ['', t('Даваа'), t('Мягмар'), t('Лхагва'), t('Пүрэв'), t('Баасан'), t('Бямба'), t('Ням')]; }, storageKey: storageKey };
  observe();
  function ready() { updateDays(); translate(document); updateButton(); emit(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true }); else ready();
  window.addEventListener('storage', function (event) { if (event.key === storageKey && event.newValue) setLanguage(event.newValue); });
})();
