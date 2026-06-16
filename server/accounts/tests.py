from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

User = get_user_model()


class ProfileAvatarTests(TestCase):
    """Avatar upload/fetch/delete endpoints under /api/profile/avatar"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="avatar_tester",
            password="testpass123",
            role=User.Role.CUSTOMER,
        )
        # The API uses JWT auth (not session auth), so authenticate requests
        # by attaching a valid access token rather than client.login().
        from ninja_jwt.tokens import RefreshToken

        token = RefreshToken.for_user(self.user).access_token
        self.auth_header = {"HTTP_AUTHORIZATION": f"Bearer {token}"}

    def _tiny_png(self, name="avatar.png"):
        # 1x1 transparent PNG
        content = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
            b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01"
            b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        return SimpleUploadedFile(name, content, content_type="image/png")

    def test_upload_then_profile_reports_has_avatar(self):
        resp = self.client.post(
            "/api/profile/avatar",
            {"file": self._tiny_png()},
            **self.auth_header,
        )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["has_avatar"])

        self.user.refresh_from_db()
        self.assertTrue(self.user.avatar)

        profile_resp = self.client.get("/api/profile", **self.auth_header)
        self.assertEqual(profile_resp.status_code, 200)
        self.assertTrue(profile_resp.json()["has_avatar"])

    def test_get_avatar_returns_404_when_none_set(self):
        resp = self.client.get("/api/profile/avatar", **self.auth_header)
        self.assertEqual(resp.status_code, 404)

    def test_get_avatar_returns_file_after_upload(self):
        self.client.post(
            "/api/profile/avatar", {"file": self._tiny_png()}, **self.auth_header
        )
        resp = self.client.get("/api/profile/avatar", **self.auth_header)
        self.assertEqual(resp.status_code, 200)
        self.assertGreater(len(b"".join(resp.streaming_content)), 0)

    def test_rejects_non_image_upload(self):
        bad_file = SimpleUploadedFile(
            "notes.txt", b"hello world", content_type="text/plain"
        )
        resp = self.client.post(
            "/api/profile/avatar", {"file": bad_file}, **self.auth_header
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("image", resp.json()["message"].lower())

    def test_rejects_oversized_upload(self):
        big_content = b"\x89PNG\r\n\x1a\n" + (b"0" * (2 * 1024 * 1024 + 1))
        big_file = SimpleUploadedFile(
            "big.png", big_content, content_type="image/png"
        )
        resp = self.client.post(
            "/api/profile/avatar", {"file": big_file}, **self.auth_header
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("2mb", resp.json()["message"].lower())

    def test_delete_avatar(self):
        self.client.post(
            "/api/profile/avatar", {"file": self._tiny_png()}, **self.auth_header
        )
        resp = self.client.delete("/api/profile/avatar", **self.auth_header)
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.json()["has_avatar"])

        self.user.refresh_from_db()
        self.assertFalse(self.user.avatar)
