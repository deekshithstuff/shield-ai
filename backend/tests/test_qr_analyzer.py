import io
import unittest

import qrcode

from app.services.qr_analyzer import analyze_qr_image


class QrAnalyzerTests(unittest.TestCase):
    def _make_qr_bytes(self, payload: str) -> bytes:
        image = qrcode.make(payload)
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        return buffer.getvalue()

    def test_safe_url_qr_is_classified_safe(self):
        payload = "https://www.google.com/"
        result = analyze_qr_image(self._make_qr_bytes(payload), filename="safe.png")
        self.assertEqual(result.status, "SAFE")
        self.assertEqual(result.decoded_content, payload)
        self.assertTrue(result.is_url)

    def test_phishy_url_qr_is_classified_suspicious_or_dangerous(self):
        payload = "https://secure-login-example.com/verify"
        result = analyze_qr_image(self._make_qr_bytes(payload), filename="phish.png")
        self.assertIn(result.status, {"SUSPICIOUS", "DANGEROUS"})
        self.assertEqual(result.decoded_content, payload)
        self.assertTrue(result.is_url)

    def test_plain_text_qr_is_not_a_url(self):
        payload = "Hello SHIELD.AI"
        result = analyze_qr_image(self._make_qr_bytes(payload), filename="text.png")
        self.assertFalse(result.is_url)
        self.assertEqual(result.decoded_content, payload)
        self.assertEqual(result.status, "SAFE")


if __name__ == "__main__":
    unittest.main()
