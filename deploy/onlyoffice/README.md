# ONLYOFFICE Docs сервер холбох

Энэ хавтас нь бүрэн Word, Excel, PowerPoint, PDF засварлагч болон Office файл хөрвүүлэх серверийн тохиргооны жишээ юм. Сайт энгийн TXT, DOCX, хүснэгт, PDF засварлагчтайгаа сервер холбохоос өмнө ажиллана. Бүрэн Office засварлагчид Document Server шаардлагатай.

Багц `onlyoffice/documentserver:9.4.0.1` хувилбарыг ашиглана. Энэ tag нь Docker Hub дээр 2026-10-01-нд шалгагдсан бөгөөд amd64, arm64 image-тэй. PDF-д одоогийн API-ийн `documentType: "pdf"` тохиргоог ашиглана.

## 1. Серверийн хавтас бэлтгэх

Docker Engine болон Docker Compose plugin бүхий сервер дээр энэ `deploy/onlyoffice` хавтсыг **вэбийн нийтэд нээлттэй үндсэн хавтаснаас гадна** хуулна. Жишээ нь `/srv/class12-2-office` ашиглаж болно. `.env`, JWT түлхүүр, Docker volume-уудыг website-ийн file manager-аар нийтэд нээлттэй байршуулахгүй. Багцад бодит түлхүүр оруулаагүй.

```sh
cd /srv/class12-2-office
cp .env.example .env
chmod 600 .env
openssl rand -hex 32
```

Сүүлийн командын үүсгэсэн 64 тэмдэгттэй утгыг `.env` файлын `JWT_SECRET=` мөрөнд оруулна. Энэ нь 32 санамсаргүй byte бүхий түлхүүр. Үүнийг доорх сайтын админ тохиргоонд мөн яг ижил оруулна.

```sh
docker compose config --quiet
docker compose up -d
```

`compose.yaml` JWT шалгалтыг асааж, `Authorization` header болон body token-ыг дэмжинэ. Серверийн HTTP порт зөвхөн тухайн host-ийн `127.0.0.1:8082` хаягт нээгдэнэ. Лог, өгөгдөл, файл cache болон PostgreSQL-ийн замд тусдаа volume хадгална; 9.4-ийн шинэ Community бүтэц PostgreSQL volume-ыг ашиглахгүй байж болно.

## 2. HTTPS хаяг тохируулах

Жишээ нь `docs.example.com` гэсэн DNS хаягийг сервер рүү чиглүүлнэ. Одоо ашиглаж байгаа HTTPS reverse proxy-д энэ хаягийг `http://127.0.0.1:8082` руу дамжуулна. WebSocket холболт болон `X-Forwarded-Proto: https` дамжих ёстой.

`Caddyfile.example` нь **host дээр ажилладаг Caddy**-д зориулсан жишээ. Өөрийн domain-оор солиод одоогийн Caddyfile-д нэмнэ. Caddy автоматаар HTTPS болон WebSocket proxy-г тохируулна. Сервер дээр Nginx/Apache 80, 443 портыг ашиглаж байгаа бол тухайн proxy-д ижил virtual host тохируулж болно; давхар proxy ажиллуулах шаардлагагүй.

```sh
curl --fail https://docs.example.com/healthcheck
```

Хариу `true` байх ёстой. Эхний асаалт хэдэн минут шаардаж болно. Health check амжилттай болох нь website-тай файл нээх/хадгалах холболт ажилласныг дангаараа батлахгүй.

## 3. Сайтын админ тохиргоо

Сайтын `admin.php` хуудсанд нэвтэрч бүрэн Office засварлагчийн тохиргоонд дараах утгуудыг хадгална:

| Тохиргоо | Жишээ |
| --- | --- |
| Document Server / Server URL | `https://docs.example.com` |
| Site URL | `https://class.example.com` |
| JWT secret | `.env` дэх `JWT_SECRET`-тэй яг ижил утга |
| Internal server URL | Ихэнх тохиолдолд хоосон; PHP сайт Document Server-тэй нэг host дээр байвал `http://127.0.0.1:8082` ашиглаж болно |
| Enabled | Асаана |

Сайт дэд замд байрладаг бол Site URL-д замыг оруулна: жишээ нь `https://example.com/class12-2`. Төгсгөлд `/` шаардлагагүй. Server URL нь сурагчдын хөтөчөөс нээгдэх HTTPS хаяг байх ёстой; `localhost` нь сурагчдын өөрийн төхөөрөмжийг заана.

PHP сайт дээр **cURL extension** ажиллах шаардлагатай. PHP-ээс Document Server рүү, Document Server-ээс сайтын `office.php` рүү хоёр чиглэлд холбогдох ёстой. Document Server нь сайтын Site URL-ийг DNS-ээр олж, хүчинтэй HTTPS certificate-ийг шалгаж, нэг файлын хугацаатай холбоос болон хадгалах callback-ийг ашиглана. Нэмэлт password/login proxy, CAPTCHA эсвэл firewall нь энэ server-to-server холболтыг хааж болохгүй.

Public HTTPS Site URL ашиглавал `ALLOW_PRIVATE_IP_ADDRESS=false`-г хэвээр үлдээнэ. Site URL зориуд private IP рүү заадаг дотоод deployment-д л `.env` дэх утгыг `true` болгоод container-ийг дахин үүсгэнэ. Docker container дотор `127.0.0.1` нь PHP host-ийг заахгүй; Site URL-д хоёр талаас хүрэх жинхэнэ хаяг хэрэглэнэ.

## 4. Нээх, хадгалах, хөрвүүлэхийг шалгах

1. Сайтаас хүүхдийн хавтсыг нууц үгээр нээнэ.
2. Туршилтын DOCX, XLSX эсвэл PDF файлын «Файл засах» товчийг дарна.
3. Бүрэн засварлагч нээгдэхийг шалгаад жижиг өөрчлөлт хийж хадгална. Засварлагчийг хааж, файл шинэчлэгдэж байгааг татаж эсвэл дахин нээж шалгана; эцсийн хадгалалт хэдэн секунд шаардаж болно.
4. Туршилтын Office файлыг PDF болгон хөрвүүлж, үүссэн хуулбарыг нээнэ.
5. Хуваалцах холбоосыг өөр хөтөчөөс шалгана. Холбоостой зочин үзэх, татах, зөвшөөрсөн хавтаст файл **нэмэх** эрхтэй; бусдын файлыг засах, устгах эрхгүй. Нэг файлын холбоос зөвхөн үзэх/татах эрхтэй.

DOC, XLS, PPT зэрэг хуучин Office файлыг бүрэн засварлагчаар нээхэд эх файлыг үлдээж орчин үеийн DOCX/XLSX/PPTX хуулбар үүсгэнэ. Бүрэн Office засварлагч/серверийн хөрвүүлэлтэд нэг файл 64 МБ хүртэл; энгийн browser засварлагчид 32 МБ хүртэл байна. Office session холбоос хугацаатай: удаан ажилласны дараа хадгалж, файлаа дахин нээгээрэй.

## Ажиллагааг шалгах

```sh
docker compose ps
docker compose logs --tail 100 documentserver
```

Хуудас нээгдэж байгаа ч файл нээгдэхгүй бол Site URL-д container-оос хүрч байгаа эсэх, HTTPS certificate, JWT түлхүүрийн таарч байгаа эсэхийг шалгана. Файл нээгдээд хадгалагдахгүй бол callback холболт, PHP cURL, storage quota болон дискний зайг шалгана. Internal URL ашиглахад output URL нь тохируулсан Document Server-ийн public эсвэл internal origin-той таарах ёстой.

Volume-ууд болон PHP сайтын одоогийн `database/` хавтсыг backup хийнэ. Container-ийг зогсооход `docker compose down` ашиглаж болно; `down --volumes` нь өгөгдлийг устгадаг тул backup-гүй үед ашиглахгүй.

## Албан ёсны эх сурвалж

- [ONLYOFFICE Docker installation](https://helpcenter.onlyoffice.com/docs/installation/docs-community-install-docker.aspx)
- [ONLYOFFICE JWT configuration](https://helpcenter.onlyoffice.com/docs/installation/docs-configure-jwt.aspx)
- [ONLYOFFICE Docs API configuration, including PDF](https://api.onlyoffice.com/docs/docs-api/usage-api/config/)
- [ONLYOFFICE 9.4 release](https://github.com/ONLYOFFICE/DocumentServer/releases/tag/v9.4.0)
- [ONLYOFFICE Docker image](https://hub.docker.com/r/onlyoffice/documentserver)
- [Verified 9.4.0.1 Docker tag metadata](https://hub.docker.com/v2/repositories/onlyoffice/documentserver/tags/9.4.0.1)
- [Caddy reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)

Энэ багц зөвхөн тохиргооны файлуудыг агуулна. Docker эсвэл серверийг автоматаар суулгаагүй, асаагаагүй.
