# Kế hoạch làm lại reader InkRail

Trạng thái: đề xuất, chưa triển khai. Khảo sát ngày 23/11/2026 trên production sau khi quay về commit `95f4077`. Code local có thay đổi backend chưa phát hành lại; không dùng trạng thái local đó làm mốc cho reader mới.

## Mục tiêu

Người đọc mở chương là đọc được ngay, đổi chương dễ bằng một tay, tìm lại vị trí cũ và điều chỉnh cách đọc mà không phải hiểu thuật ngữ kỹ thuật. Giữ nhận diện InkRail và các token hiện có.

Quyết định đã chốt với người dùng: cuộn dọc mặc định trên điện thoại, đồng thời giữ chế độ lật trang cho người thích đọc manga. Lựa chọn người đọc đã lưu luôn được ưu tiên, không bị ghi đè khi nâng cấp. Một trang trên desktop vẫn là đề xuất thiết kế.

## Khảo sát và bằng chứng

Mẫu: One Piece (Official Colored), chương 684, phiên đã đăng nhập. Quan sát desktop ở viewport mặc định và mobile giả lập 390 × 844. Đây là quan sát một chương manga, chưa đại diện cho mọi định dạng truyện hoặc điện thoại thật.

| Bước | Trạng thái | Quan sát và ảnh |
| --- | --- | --- |
| 1. Tiếp tục đọc trên desktop | Hoạt động, cần làm rõ điều khiển | Vào được chương đã lưu và ảnh hiện rõ. Thanh công cụ tối giản, phần lớn thao tác phụ nằm trong cài đặt. [Ảnh 1](../output/reader-ux-plan/01-desktop-reading.jpg). |
| 2. Mở cài đặt desktop | Cần tổ chức lại | Bảng trải ngang đáy màn hình. Đang cuộn dọc vẫn hiện hướng lật trang. Lưu truyện, lưu ảnh và toàn màn hình nằm lẫn với cấu hình hiển thị. [Ảnh 2](../output/reader-ux-plan/02-desktop-settings.jpg). |
| 3. Đọc trên mobile | Đọc được, cần cải thiện khả năng tìm thao tác | Ảnh gần đầy chiều rộng; chọn chương và cài đặt nằm góc trên. Cần kiểm tra việc gọi lại thanh công cụ khi tự ẩn trên thiết bị thật. [Ảnh 3](../output/reader-ux-plan/03-mobile-reading.jpg). |
| 4. Chọn chương trên mobile | Ưu tiên sửa cao nhất | Đang chương 684 nhưng danh sách mở từ chương 1; ba bản chương 1 xuất hiện riêng, tên bị cắt, không thấy tìm số chương hoặc nhảy về chương hiện tại. [Ảnh 4](../output/reader-ux-plan/04-mobile-chapters.jpg). |
| 5. Cài đặt mobile | Cần giảm lựa chọn và giải thích rõ | Bốn dropdown, gồm cả lựa chọn không liên quan đến chế độ hiện tại; thiếu tách biệt giữa thao tác đọc và tùy chỉnh. [Ảnh 5](../output/reader-ux-plan/05-mobile-settings.jpg). |

### Ảnh khảo sát

![1. Đọc trên desktop](../output/reader-ux-plan/01-desktop-reading.jpg)
![2. Cài đặt desktop](../output/reader-ux-plan/02-desktop-settings.jpg)
![3. Đọc trên mobile](../output/reader-ux-plan/03-mobile-reading.jpg)
![4. Chọn chương khi đang ở chương 684](../output/reader-ux-plan/04-mobile-chapters.jpg)
![5. Cài đặt mobile](../output/reader-ux-plan/05-mobile-settings.jpg)

## Trải nghiệm đề xuất

### 1. Vùng đọc

- Mobile cuộn dọc: ảnh vừa chiều rộng, giữ tỷ lệ gốc, không ép chiều cao; khoảng cách giữa trang manga nhỏ, webtoon có lựa chọn liền mạch.
- Desktop: một trang mặc định; cho phép bật hai trang hoặc cuộn dọc. Ghép đôi không chia cắt ảnh đôi có sẵn; có tùy chọn lệch trang bìa.
- Lật trang: nút trước/sau, bàn phím và vuốt có cùng ý nghĩa theo hướng LTR/RTL. Không đoán hướng đọc chỉ từ ngôn ngữ bản dịch.
- Khi đang zoom, kéo ảnh không chuyển trang; giữ pinch zoom tự nhiên trên điện thoại. Double tap để zoom là tính năng đợt sau, không chiếm gesture của hệ điều hành trong đợt đầu.
- Đổi kiểu đọc giữ đúng trang đang xem. Đổi kích thước cửa sổ không làm người đọc mất vị trí.

### 2. Điều khiển mobile

- Thanh trên: quay về truyện, tên rút gọn, số chương. Thanh dưới khi mở công cụ: **Chương trước – Danh sách chương – Chương sau**, hàng tiến độ riêng với nhãn **Trang 7/20** có thể bấm để nhập số trang.
- Dùng chữ “Chương” và “Trang” rõ ràng; tránh đặt hai cặp mũi tên giống nhau cạnh nhau.
- Chạm một lần vào vùng đọc để hiện/ẩn công cụ. Trong cuộn dọc không dùng chạm mép ảnh để đổi trang. Một gợi ý ngắn xuất hiện lần đầu và có thể bỏ qua.
- Chỉ tự ẩn khi đang đọc; không ẩn lúc mở bảng, kéo tiến độ hoặc focus bằng bàn phím. Công cụ phủ lên vùng đọc, không khiến ảnh đổi kích thước khi ẩn/hiện. Có chế độ luôn hiện công cụ.
- Vùng bấm mục tiêu ít nhất 44 × 44 CSS px; tính cả safe area ở đáy màn hình.

### 3. Điều khiển desktop

- Toolbar gọn phía trên; công cụ đọc và tiến độ dễ gọi lại. Chọn chương/cài đặt mở bảng bên phải thay vì bảng rộng toàn đáy màn hình.
- Phím mũi tên theo hướng đọc, Space/Page Down cuộn trong chế độ dọc, Esc đóng bảng. Không chặn phím khi người dùng đang nhập số trang/chương.
- Hiện chú thích phím tắt trong menu trợ giúp; không yêu cầu học phím tắt để sử dụng được reader.

### 4. Danh sách chương — P0

- Mở tại chương đang đọc, hiển thị các chương lân cận; có nút “Về chương đang đọc”.
- Tìm theo số/tên, hỗ trợ số thập phân và chương đặc biệt; không ép mọi số chương thành số nguyên.
- Mỗi số chương là một mục chính; nhiều bản dịch/nhóm được gom dưới mục đó. Hiển thị ngôn ngữ và nhóm rõ ràng; ưu tiên nhóm đang đọc nếu có ở chương tiếp theo, vẫn cho phép chọn bản khác.
- Giữ ngôn ngữ khi chuyển chương. Khi thiếu bản cùng nhóm hoặc ngôn ngữ, thông báo và cho người đọc chọn; không chuyển âm thầm.
- Danh sách dài chỉ render phần cần thiết. Tìm/chọn chương không yêu cầu tải lại ảnh chương hiện tại.

### 5. Cài đặt — P0

- Nhóm cơ bản gồm **Cách đọc** (cuộn dọc / một trang / hai trang), **Cỡ ảnh** (vừa ngang / vừa trang / kích thước gốc) và **Nền** (tối / sáng / giấy).
- Hướng LTR/RTL chỉ xuất hiện khi dùng lật trang; hai trang chỉ được đề xuất khi màn hình đủ rộng. Mỗi lựa chọn có mô tả ngắn về kết quả.
- Áp dụng ngay, không có nút lưu bắt buộc. Cho phép khôi phục mặc định; giữ cài đặt cũ hợp lệ khi nâng cấp.
- Đưa lưu truyện, toàn màn hình và báo ảnh lỗi sang menu thao tác riêng. “Lưu ảnh chương” không phải lựa chọn chính trong bảng cài đặt.
- Ghi nhớ lựa chọn theo thiết bị và ngoại lệ theo truyện; đồng bộ tài khoản chạy nền, không chặn đọc.

### 6. Tiếp tục đọc, cuối chương và lỗi — P0

- Vào từ “Tiếp tục đọc” khôi phục vị trí đã lưu. Vào một chương bằng link bình thường có thể hiện “Tiếp tục trang 7” và “Đọc từ đầu”; không tự nhảy gây khó hiểu.
- Lưu trang và vị trí tương đối trong trang; đợi ảnh trước vị trí khôi phục có kích thước ổn định. Đổi hướng đọc không reset tiến độ.
- Cuối chương có một nút chính **Đọc chương 685**, bên dưới là danh sách chương và về trang truyện. Không tự chuyển chương mặc định.
- Mỗi ảnh có trạng thái tải, lỗi và nút thử lại riêng. Ảnh lỗi không phá bố cục hoặc bắt tải lại cả chương. Tách lỗi nguồn, mất mạng và chương không tồn tại.
- Mở bảng/đổi nền không gửi lại request lấy chương. Giữ vùng đọc cũ khi chuyển chương và hiện trạng thái đang tải cho đến khi chương mới sẵn sàng.

## Trình tự triển khai

| Đợt | Công việc | Điều kiện hoàn tất |
| --- | --- | --- |
| 1. Chốt thiết kế | Đã chốt cuộn dọc mặc định trên mobile và giữ lật trang; làm mock mobile/desktop cho đọc, chọn chương, cài đặt và cuối chương; duyệt tương tác trước khi code. | Có thiết kế được chọn và luồng thao tác rõ. |
| 2. Reader cốt lõi | Tách vùng đọc, thanh công cụ, danh sách chương và bảng cài đặt; hoàn thành các mục P0. | Đọc, đổi chương, chọn bản dịch và trở lại vị trí cũ hoạt động trong preview. |
| 3. Tải ảnh và độ ổn định | Ưu tiên ảnh đang đọc, tải trước ít ảnh lân cận; giảm tải trước trên mạng yếu; giữ chỗ ảnh, phục hồi sau mất mạng và thử lại từng ảnh. | Không phát sinh tải toàn chương khi chỉ đổi cài đặt; không có nhảy vị trí ngoài dự kiến. |
| 4. Kiểm thử và phát hành | Đo cùng bộ truyện/mạng với production hiện tại; thử điện thoại thật, desktop và tablet; phát hành sau khi kiểm tra preview. | Không thoái lui tốc độ, tiến độ hoặc đăng nhập; có bản deploy trước đó để phục hồi. |

Khi bắt đầu code, tạo checkout riêng từ mốc trước backend, đối chiếu các sửa lỗi đăng nhập đang cần giữ. Không triển khai reader mới trực tiếp trên nhánh local đang chứa các thay đổi backend vừa bị gỡ khỏi production.

Các vùng code dự kiến: route `src/app/read/[chapterId]/page.tsx`, `src/components/reader-client.tsx`, các helper reader preferences/progress/presets và Sheet hiện có. Tách thành ReaderViewport, ReaderToolbar, ReaderProgress, ChapterPicker, ReaderSettings, ChapterEnd và PageImage khi thực sự cần; tránh thay đổi hợp đồng nguồn truyện hoặc thêm tầng backend mới trong đợt này.

## Tiêu chí nghiệm thu

1. Điện thoại 360–430 px không có tràn ngang, công cụ không che nội dung khi đọc; kiểm tra thêm tablet và desktop.
2. Đang chương 684 thì mở danh sách thấy ngay chương 684 và các chương lân cận; tìm chương 700 không cần cuộn qua hàng trăm dòng.
3. Đổi chương từ trạng thái đọc thông thường tối đa hai thao tác; cuối chương chỉ một thao tác. Không chuyển sai ngôn ngữ/nhóm mà không báo.
4. Đổi bố cục, xoay màn hình, mở/đóng cài đặt và quay lại sau reload vẫn giữ trang/vị trí đọc phù hợp.
5. Ảnh hiện tại được ưu tiên hơn tải trước. Ghi nhận thời gian tới ảnh đầu tiên đọc được, thời gian đổi chương và số request; so sánh ít nhất 10 lượt lạnh/ấm tách riêng trên cùng điều kiện mạng, không chỉ đo HTTP 200 hay TTFB.
6. Kiểm tra mất mạng, một ảnh 404, chương không có ảnh, chương dẫn ra nhà phát hành, trang đôi, webtoon dài và bản dịch trùng số chương.
7. Tab đi được toàn bộ công cụ, focus nằm trong bảng khi mở và trả về nút gọi khi đóng; tên nút rõ, có focus nhìn thấy và hỗ trợ reduced motion. Đo contrast và thử screen reader riêng trước khi kết luận khả năng tiếp cận.

Giới hạn khảo sát: chưa thử chương cuối, lỗi ảnh, các gesture trên máy thật, screen reader hoặc benchmark hiệu năng trong lượt khảo sát này. Các mục tương ứng ở trên là yêu cầu thiết kế/kiểm thử, không phải lỗi đã được xác nhận.
