# MangaFire và hướng thiết kế cho InkRail

Khảo sát ngày 20/11/2026 bằng Firecrawl và REA trên phiên khách. Firecrawl lấy nội dung trang và thông số nhận diện. REA ghi màn hình, DOM, cây trợ năng và request khi dùng giao diện bình thường. Các màn hình desktop được xem ở 1440 × 900. Trang chủ, trang truyện và reader được kiểm tra thêm ở 390 × 844. [MangaFire](https://mangafire.to/)

## Nguồn truyện và khả năng tích hợp

**MangaFire phân phối dữ liệu qua backend của website và tải ảnh từ các host riêng. Chưa xác định được nguồn nhập toàn bộ danh mục, cũng chưa tìm thấy tài liệu API dành cho đối tác hoặc điều khoản cho phép bên thứ ba phân phối lại nội dung.**

| Lớp | Quan sát từ phiên khách |
| --- | --- |
| Xếp hạng | `GET /api/top-titles` trả 200. Chọn Week đổi `days` từ 1 sang 7. |
| Danh mục và tìm kiếm | `GET /api/titles` trả 200. Latest Updates gửi bộ lọc, thứ tự, phân trang và `hot`; ô tìm nhanh gửi `keyword` và giới hạn kết quả. Browse còn gọi `GET /api/filter-options`. |
| Truyện và danh sách chương | `GET /api/titles/{titleId}` rồi `GET /api/titles/{titleId}/chapters`. Mẫu gửi ngôn ngữ, kiểu sắp xếp, chiều sắp xếp, số trang và giới hạn 20 chương mỗi lần. |
| Reader | `GET /api/chapters/{chapterId}` trả 200 rồi trình duyệt tải ảnh. Nút Previous chuyển URL từ chương 93 sang 92 và tải bản ghi chương tương ứng. |
| Ảnh và tài nguyên giao diện | `static.mfcdn.nl` phân phối ảnh bìa, có biến thể `@280.jpg`. `q73.mfcdn3.xyz` phân phối ảnh trang của chương mẫu. `s.mfcdn.nl` phục vụ CSS và JavaScript. Các host này xác nhận lớp phân phối. |

Các request danh mục, tìm kiếm, chi tiết truyện và chương mang tham số `vrf` trong phiên quan sát. Các đường dẫn ở trên mô tả hành vi của frontend. Cách cấp quyền cho đối tác, hợp đồng tích hợp và khả năng truy cập bên ngoài phiên frontend chưa được xác minh. Trang liên hệ công khai có biểu mẫu hỗ trợ. [Trang chủ](https://mangafire.to/) · [Browse](https://mangafire.to/browse) · [Reader mẫu](https://mangafire.to/title/zxwow-nanase-san-no-koi-ga-ijou/chapter/9583463) · [Contact](https://mangafire.to/contact)

**Đối chiếu một truyện.** MangaFire liên kết *Nanase-san no Koi ga Ijou* sang MyAnimeList, AniList, MangaUpdates, MangaDex và MangaBaka. Mô tả tiếng Anh trên MangaFire trùng một phần văn bản Mangamo công bố. GANMA! giới thiệu ấn bản tiếng Nhật, còn Mangamo xác nhận phát hành bản tiếng Anh trên ứng dụng của họ. Đây là bằng chứng về ấn bản và nội dung mô tả. Chuỗi cung cấp file ảnh cho MangaFire và quyền phân phối của MangaFire vẫn chưa xác định. [Trang truyện MangaFire](https://mangafire.to/title/zxwow-nanase-san-no-koi-ga-ijou) · [GANMA!](https://store.ganma.jp/comics/nanasesan/) · [Công bố của Mangamo](https://www.mangamo.com/news/youve-never-had-manga-love-like-this-nanase-sans-crazy-love-obsession-review)

| Nguồn cho InkRail | Cách sử dụng |
| --- | --- |
| MangaDex | Adapter hiện có. API có tài liệu về truyện, feed chương và MangaDex@Home. Chính sách API yêu cầu ghi công MangaDex và nhóm dịch, tôn trọng yêu cầu gỡ bản dịch, đồng thời giới hạn dự án có quảng cáo hoặc dịch vụ thu phí. Quyền sử dụng ảnh cần được xét theo nội dung. [Tài liệu và chính sách MangaDex](https://gitlab.com/mangadex-pub/mangadex-api-docs/-/blob/main/index.md) |
| OTruyen | Adapter tiếng Việt hiện có. Tài liệu công khai xác nhận API danh mục, thể loại, truyện và tìm kiếm. Điều kiện tái phân phối ảnh chưa được xác minh trong khảo sát này. [Tài liệu OTruyen](https://docs.otruyenapi.com/) |
| Nhà phát hành, tác giả và đối tác | Dùng nguồn đã cấp quyền cho reader nhúng. Với truyện phát hành ở dịch vụ khác, mở trang đọc chính thức khi có URL phù hợp. |
| Firecrawl | Hiện là phương án tìm URL MangaDex khi hai nguồn chính không có kết quả. Dùng Firecrawl hỗ trợ khảo sát và phát hiện metadata. |

**Quyết định đề xuất.** Giữ lớp adapter theo nguồn của InkRail. Gắn nguồn, ngôn ngữ, nhóm dịch hoặc nhà phát hành và kiểu truy cập ở cấp chương. Reader hỗ trợ chương có ảnh được phép hiển thị, chương dẫn ra trang phát hành và trạng thái không khả dụng. Chỉ bổ sung adapter MangaFire sau khi có thông tin tích hợp và quyền sử dụng được xác nhận từ bên cung cấp.

## Cấu trúc màn hình và luồng sử dụng

| Màn hình | Hành vi và bố cục quan sát được |
| --- | --- |
| Trang chủ `/` | Header desktop có logo, ô tìm, phím ⌘K, nút truyện ngẫu nhiên, menu Browse, cài đặt nội dung và Sign in. Thứ tự bên dưới là chia sẻ, Trending, Latest Updates và footer. Trending là dải poster có Day/Week/Month và mũi tên. Latest Updates có Hot/New, lọc loại truyện, chế độ lưới/danh sách và phân trang. Mobile dùng biểu tượng tìm, khoảng lề 16 px, hiển thị hai poster Trending và một cột cập nhật trong chế độ danh sách. [Trang chủ MangaFire](https://mangafire.to/) |
| Tìm nhanh | Gõ “Nanase” trong header trả danh sách gợi ý ngay dưới ô tìm, gồm ảnh thu nhỏ, tên truyện, loại và số chương mới nhất. Phiên kiểm tra hiện 5 gợi ý và nút xem toàn bộ kết quả. Mỗi gợi ý mở thẳng trang truyện. [Trang chủ MangaFire](https://mangafire.to/) |
| Browse `/browse` | Tìm kiếm theo tên và bộ lọc rating, loại truyện, thể loại, ngôn ngữ, trạng thái, tác giả/họa sĩ, khoảng năm phát hành, số chương tối thiểu và sắp xếp. Panel desktop có nút thu gọn, số bộ lọc đang áp dụng, nút đặt lại, tổng kết quả và công tắc lưới/danh sách. Đường dẫn từ tag và tác giả có tham số lọc. [Browse](https://mangafire.to/browse) |
| Chi tiết `/title/{id}-{slug}` | Desktop dùng bìa bên trái, phần thông tin bên phải và nền mờ lấy màu từ bìa. Mobile đặt bìa ở giữa trên metadata. Có tên khác, loại, trạng thái, năm, rating nội dung, điểm bình chọn, số follow, thứ hạng, tag, tác giả/họa sĩ, mô tả mở rộng và liên kết ngoài. Có Start reading, Follow, đánh giá, báo lỗi và chia sẻ. Danh sách chương hỗ trợ nhập số chương, đổi ngôn ngữ, chọn loại, sắp theo số chương hoặc ngày và phân trang. [Trang truyện mẫu](https://mangafire.to/title/zxwow-nanase-san-no-koi-ga-ijou) |
| Reader `/title/{id}-{slug}/chapter/{chapterId}` | Ảnh chiếm phần lớn viewport. Thanh tiến độ có nút nhảy đến từng trang. Cụm điều hướng chương ở góc trên phải. Thanh bên có Home, Series, Chapters, Settings, Fullscreen, Shortcuts và Report. Zoom ở góc dưới. Settings có Single, Double, Long strip, LTR/RTL, bù trang khi ghép đôi, hoạt ảnh, cuộn bằng bàn phím và vị trí thanh tiến độ. Cuối chương có điều hướng và link quay lại truyện. [Reader mẫu](https://mangafire.to/title/zxwow-nanase-san-no-koi-ga-ijou/chapter/9583463) |
| Tài khoản và tùy chọn | Hộp thoại đăng nhập bằng email/tên người dùng và mật khẩu có lối tạo tài khoản, quên mật khẩu. Giao diện mô tả tính năng đồng bộ thư viện và tiến độ. Content Preferences có lựa chọn rating, loại, nhóm độc giả, thể loại và chủ đề ẩn khỏi trang chủ. Khảo sát dừng ở phiên khách. [Trang chủ](https://mangafire.to/) · [Content Preferences](https://mangafire.to/preferences) |

Luồng chính cho InkRail là **tìm hoặc khám phá → xem truyện → chọn chương theo ngôn ngữ → đọc → đổi chương hoặc lưu vị trí**. Cho phép đọc với tư cách khách và dùng thư viện đồng bộ khi đã đăng nhập. Dữ liệu trang Browse nên biểu diễn được bằng URL để Back, Refresh và chia sẻ giữ đúng bộ lọc. Nút Continue reading dẫn về đúng chương và vị trí đã lưu.

## Hệ thống thị giác tham chiếu

| Vai trò | Quan sát trên MangaFire |
| --- | --- |
| Màu | Firecrawl trích nền `#0E131B`, nền phụ `#1F2733`, ô nhập `#191F2B`, chữ chính `#CFD2DB`, điểm nhấn `#10A3EA`. Ảnh chụp cho thấy viền mờ, chữ phụ xám và điểm màu riêng cho loại truyện. |
| Chữ | DOM tải Google Sans 400–700 và JetBrains Mono 400–600. Số chương và thời gian có kiểu monospace. Kích cỡ chữ thân Firecrawl ghi 13,5 px. |
| Khung desktop | Tại 1440 px, khung Home/Browse rộng khoảng 1152 px, header cao khoảng 66 px và khung chi tiết khoảng 952 px. Trending có 6 poster trong viewport, ảnh khoảng 178 × 252 px. Latest Updates ở chế độ danh sách có 3 cột thẻ ngang. Các kích thước này ước lượng từ ảnh chụp. |
| Thành phần | Ô tìm và nút chính có góc 8 px theo Firecrawl. Poster dùng nhãn nhỏ trên ảnh, hai hàng metadata/tên ở dưới. Thẻ cập nhật dùng bìa nhỏ bên trái với số chương và thời gian ở hàng cuối. Cụm chọn kỳ, kiểu hiển thị và trạng thái dùng các nút liền nhóm. |
| Mobile | Header thu ô tìm thành nút. Điều khiển Trending và cập nhật xuống hàng dưới tiêu đề. Trang truyện xếp dọc. Reader vẫn có thanh công cụ nổi. Ở chương mẫu, hai trang cùng hiện trong viewport 390 px với vùng trống lớn phía trên và dưới. |
| Ảnh | Bìa tạo nhịp thị giác và là nhận diện chính của thẻ. Trang chi tiết dùng lại bìa làm lớp nền mờ. Reader đặt ảnh trang trên nền tối với điều khiển bán trong suốt. Ảnh của InkRail đến từ nguồn phù hợp và tài sản nhận diện của InkRail. |

[Trang chủ](https://mangafire.to/) · [Browse](https://mangafire.to/browse) · [Chi tiết](https://mangafire.to/title/zxwow-nanase-san-no-koi-ga-ijou) · [Reader](https://mangafire.to/title/zxwow-nanase-san-no-koi-ga-ijou/chapter/9583463)

## Đưa vào InkRail

Giữ nhận diện InkRail với nền xanh đen, điểm nhấn vàng ấm và kiểu chữ hiện có. Tổ chức lại hành trình đọc theo các mẫu đã kiểm chứng. Dùng bố cục và thành phần riêng của InkRail, với poster làm trọng tâm và số thao tác tối thiểu từ khám phá đến chương đầu. [Token hiện tại](./src/app/globals.css)

| Ưu tiên | Phần đã có trong repo | Phần cần bổ sung |
| --- | --- | --- |
| 1. Khám phá và tìm kiếm | Trang chủ có hero nổi bật, các rail, mục cập nhật và tiếp tục đọc. Header đã có tìm tức thời. | Đưa nội dung cập nhật và xu hướng lên vùng nhìn đầu, giữ Tiếp tục đọc dễ thấy. Thêm truy cập Browse rõ ràng và trạng thái rỗng/lỗi theo nguồn. Chỉ hiển thị kỳ ranking khi có số liệu theo kỳ. [Trang chủ](./src/app/page.tsx) · [Tìm tức thời](./src/components/instant-search.tsx) |
| 2. Browse và trang truyện | `/discover` có tìm, lưới/danh sách, thể loại, trạng thái, năm cập nhật và sắp xếp. Trang truyện có follow, tìm số chương, sắp xếp và lọc ngôn ngữ trên các chương đã tải. | Dùng lại lưới/danh sách. Thêm bộ lọc ngôn ngữ và loại truyện khi adapter cung cấp dữ liệu. Thêm năm phát hành như trường riêng. MangaDex hiện lấy tiếng Việt trước và chỉ lấy tiếng Anh khi thiếu tiếng Việt, nên bộ chọn ngôn ngữ cần gọi feed theo lựa chọn. [Kết quả khám phá](./src/components/discover-results.tsx) · [Danh sách chương](./src/components/chapter-list.tsx) · [Adapter MangaDex](./src/lib/sources/mangadex.ts) |
| 3. Reader | `/read/[chapterId]` có đọc dọc, hướng ngang LTR/RTL, fit, bookmark, lưu tiến độ, điều hướng bằng phím và thao tác vuốt. Chế độ ngang hiện xếp ảnh trong grid. Reader dọc có điều hướng cuối chương. | Tách kiểu hiển thị một trang/hai trang/cuộn dọc khỏi hướng đọc. Cho chọn chương tại chỗ và đặt hành vi điều hướng nhất quán giữa các layout. Mobile ưu tiên một trang cho manga và cuộn dọc cho webtoon theo tùy chọn người đọc. [Reader client](./src/components/reader-client.tsx) · [Kiểu dữ liệu reader](./src/lib/types.ts) |
| 4. Thư viện và cá nhân hóa | Có Supabase Auth, thư viện, follow, bookmark, lịch sử và tùy chọn đọc. | Dùng lại lịch sử cho Continue reading, lưu bộ lọc nội dung theo khả năng của từng nguồn, duy trì trạng thái khách và đồng bộ khi đăng nhập. [Thư viện](./src/app/library/page.tsx) · [Nguồn dữ liệu](./src/lib/sources/index.ts) |

Adapter MangaDex giữ chương có `externalUrl` trong feed. Kiểu `Chapter` hiện chưa lưu URL này và luồng mở chương vẫn gọi At-Home. Cần lưu URL phát hành khi chuẩn hóa dữ liệu để reader chọn đúng cách mở. [Adapter MangaDex](./src/lib/sources/mangadex.ts) · [Kiểu Chapter](./src/lib/types.ts)

Kiểm thử bản triển khai theo các hành trình khách và tài khoản ở desktop/mobile. Các điểm cần xác nhận gồm tìm rồi mở đúng truyện, lọc rồi dùng Back, nhảy chương, chuyển layout, tiếp tục đúng vị trí và mở được đường dẫn phát hành khi chương là liên kết ngoài.

## Dấu vết kiểm chứng

| Bằng chứng | Mã REA |
| --- | --- |
| Trang chủ desktop, ảnh đã kiểm tra | `ev_3d105c9fdc5e4897270e848ba69f716c0d492130ac5698847a70cadc06606bc4` |
| Trang chủ mobile | `ev_18ff13aa370fc0812f6e339453feed12b6e1e0893fa12273eea701a21fa1ff3f` |
| Browse desktop | `ev_b87bc207dc81f7f0a1df9a276b1cbda522ae1ece4d603d74484bec8fb713072c` |
| Trang truyện desktop / mobile | `ev_94ac10e79b7dfbc51ca9132caa031d81eeadd657ead704598736a0dc3d15cec2` / `ev_003c1e805a3bd849c2a322236c997317563a9a563f1e7deba4c8ab87f461a14e` |
| Reader desktop / mobile | `ev_487b753bd82a221cbf85c086f762d968a5983e6c68028cbfa922cab2a84dc87a` / `ev_68918a490e015233ae260d42951d6e3f5337ea1ca4664b7deec8962270877c07` |
| Gợi ý tìm kiếm | `ev_630c65a337b28a2038a63a112aba778530376eee2193d2195c1cb337945d42e9` |
| Chuyển kỳ Trending | `ev_429fab5864fc2956c6754df36058d66a14c8c990324fa80a097f584cb1a0a2c8` |
| Mở cài đặt reader | `ev_e208cc5a07a84d1ea90ca7ca2ddf923d46ff0f36db55535e82c30313d9b78587` |
| Chuyển chương 93 → 92 | `ev_9d954475998c3d8e0aace36fd8448b074f99d940d2bf0b47ef5ea9afbe0ac315` |
| Mở hộp thoại đăng nhập | `ev_f86dfb400c1530e3d51be78182e12d65e1e384094be610432a21dd4de8dba364` |

Firecrawl trả HTTP 200 cho Home, Browse, Preferences, trang truyện và chương mẫu. Mã scrape dùng để đối chiếu branding trang chủ là `01a1f968-7710-70cb-ac0b-16c9a2285952`. REA quan sát request từ trình duyệt trong từng kịch bản. Chưa xác minh luồng sau đăng nhập, nguồn nhập ảnh phía máy chủ hoặc độ phủ danh mục qua nhiều truyện.
