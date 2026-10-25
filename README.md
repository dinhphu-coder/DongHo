<<<<<<< HEAD
# KAIRO Smartwatch Storefront

MVP giao diện cửa hàng đồng hồ thông minh. Phiên bản hiện tại dùng HTML, CSS và JavaScript thuần để có thể chạy ngay, dễ đọc khi mới học và chưa cần cài dependencies. Catalog và dữ liệu sản phẩm được tách riêng để sau này chuyển sang React/Vite hoặc API dễ hơn.

## Chạy trên Windows

Yêu cầu Node.js 22.10 trở lên. Không cần `npm install`.

1. Mở PowerShell trong thư mục `Web`.
2. Chạy `Copy-Item .env.example .env`.
3. Mở `.env` trên máy của bạn và điền khóa vào `OPENAI_API_KEY`. Không gửi khóa vào chat, không đưa khóa vào JavaScript phía trình duyệt và không commit file `.env`.
4. Chạy `npm start`, sau đó mở `http://127.0.0.1:3000`.

Có thể đặt `OPENAI_MODEL` và `OPENAI_BASE_URL` trong `.env` để dùng model hoặc endpoint tương thích API chat completions. Nếu chưa có khóa, cửa hàng vẫn chạy và chatbot dùng chế độ tra cứu catalog cục bộ. Font và ảnh minh họa tải từ internet.

## MVP hiện có

- 12 sản phẩm mẫu, tách trong `products.js`; tìm kiếm, lọc danh mục/thương hiệu/mức giá/tồn kho và sắp xếp.
- Hộp xem nhanh thông số tham khảo; các giá trị, giá bán và ảnh đều là dữ liệu minh họa, không phải thông tin đã xác minh.
- Giỏ hàng lưu trên thiết bị bằng `localStorage`, có cập nhật số lượng, xóa sản phẩm và phí giao hàng minh họa.
- Form đặt COD demo có kiểm tra dữ liệu và tạo mã đơn trên trình duyệt. Không gửi đơn đến máy chủ, không có thanh toán thật hay tài khoản thật.
- Chatbot gọi backend `/api/chat`; khóa AI chỉ được đọc ở Node server. Backend hỗ trợ API tương thích OpenAI, giới hạn nội dung/tần suất và chỉ đưa dữ liệu catalog demo vào ngữ cảnh.
- Giao diện responsive, nhãn ảnh, trạng thái rỗng, thông báo thêm hàng và hỗ trợ giảm chuyển động.

## Kiến trúc hiện tại

- `index.html`: cấu trúc trang, dialog và metadata cơ bản.
- `styles.css`: hệ màu, bố cục responsive và trạng thái giao diện.
- `products.js`: dữ liệu mẫu độc lập với giao diện.
- `app.js`: tìm kiếm/lọc/sắp xếp, giỏ hàng, xem nhanh, luồng đặt COD demo và giao diện trợ lý.
- `server.js`: phục vụ trang cùng origin, health check và proxy an toàn tới AI.
- `server.test.js`: kiểm thử API và phục vụ giao diện bằng `npm test`.

## Lộ trình đề xuất

1. **MVP frontend (hiện tại):** hoàn thiện trải nghiệm catalog, lọc, giỏ hàng và đặt COD minh họa; kiểm tra trên desktop/mobile.
2. **Frontend có cấu trúc:** chuyển sang React + Vite, chia component và thêm định tuyến cho trang chi tiết, tài khoản và chính sách.
3. **Backend:** API trợ lý AI đã có; thiết kế tiếp cơ sở dữ liệu PostgreSQL, xử lý đơn hàng, tồn kho và xác thực ở máy chủ. Không lưu mật khẩu thuần hoặc dữ liệu nhạy cảm trong `localStorage`.
4. **Kiểm thử và triển khai:** kiểm thử luồng mua hàng, accessibility, responsive; đưa frontend tĩnh lên Cloudflare Pages sau khi cấu hình build phù hợp.

Đăng nhập, theo dõi đơn và thanh toán trực tuyến chưa nằm trong MVP này. Chatbot chỉ biết catalog mẫu; cần xác minh thông số, hình ảnh, giá và quyền sử dụng trước khi dùng cho cửa hàng thật.
=======
# DongHo
>>>>>>> 9c077960f21d0fdfca6e60da10f443349062f91d
