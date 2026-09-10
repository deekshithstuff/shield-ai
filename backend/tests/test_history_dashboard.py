import os
import tempfile
import unittest

os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app.db import delete_all_analyses, get_dashboard_stats, get_history_records, save_analysis_record
from app.models.analysis import AnalysisSignal, AnalysisResult


class HistoryDashboardTests(unittest.TestCase):
    def setUp(self):
        delete_all_analyses()

    def test_safe_url_history_record_created(self):
        result = AnalysisResult(
            status="SAFE",
            risk_score=5,
            threat_category="No significant structural threat detected",
            explanation="Safe URL",
            recommended_action="Proceed carefully.",
            indicators=[],
        )
        record = save_analysis_record("URL", "https://example.com", result)
        self.assertEqual(record.analysis_type, "URL")
        self.assertEqual(record.status, "SAFE")
        self.assertIn("example.com", record.input_summary)

    def test_suspicious_url_history_record_created(self):
        result = AnalysisResult(
            status="SUSPICIOUS",
            risk_score=45,
            threat_category="Potential phishing or deceptive URL",
            explanation="Suspicious URL",
            recommended_action="Do not continue.",
            indicators=[AnalysisSignal(name="Suspicious URL keywords", description="Credential-like", points=15)],
        )
        record = save_analysis_record("URL", "https://secure-login.example/verify", result)
        self.assertEqual(record.status, "SUSPICIOUS")
        self.assertEqual(record.analysis_type, "URL")

    def test_dangerous_message_history_record_created(self):
        result = AnalysisResult(
            status="DANGEROUS",
            risk_score=80,
            threat_category="High-risk phishing or social-engineering message",
            explanation="Urgent phishing message",
            recommended_action="Report and delete it.",
            indicators=[AnalysisSignal(name="Urgency", description="Urgent language", points=20)],
        )
        record = save_analysis_record("MESSAGE", "URGENT: verify your password now!", result)
        self.assertEqual(record.status, "DANGEROUS")
        self.assertEqual(record.analysis_type, "MESSAGE")

    def test_qr_history_record_created(self):
        result = AnalysisResult(
            status="DANGEROUS",
            risk_score=85,
            threat_category="Potential phishing or deceptive QR destination",
            explanation="Dangerous QR destination",
            recommended_action="Do not enter credentials.",
            indicators=[AnalysisSignal(name="QR destination trust risk", description="Contains login language", points=25)],
        )
        record = save_analysis_record("QR", "https://secure-login.example/account", result)
        self.assertEqual(record.analysis_type, "QR")
        self.assertEqual(record.status, "DANGEROUS")

    def test_dashboard_statistics_update_correctly(self):
        save_analysis_record("URL", "https://example.com", AnalysisResult(status="SAFE", risk_score=10, threat_category="No significant structural threat detected", explanation="ok", recommended_action="continue", indicators=[]))
        save_analysis_record("MESSAGE", "Urgent login requested", AnalysisResult(status="SUSPICIOUS", risk_score=35, threat_category="Potential social-engineering message", explanation="suspicious", recommended_action="verify", indicators=[]))
        save_analysis_record("QR", "https://secure-login.example", AnalysisResult(status="DANGEROUS", risk_score=85, threat_category="Potential phishing or deceptive QR destination", explanation="danger", recommended_action="block", indicators=[]))
        stats = get_dashboard_stats()
        self.assertEqual(stats["total_scans"], 3)
        self.assertEqual(stats["safe_count"], 1)
        self.assertEqual(stats["suspicious_count"], 1)
        self.assertEqual(stats["dangerous_count"], 1)
        self.assertEqual(stats["url_count"], 1)
        self.assertEqual(stats["message_count"], 1)
        self.assertEqual(stats["qr_count"], 1)

    def test_history_search_filter_sort(self):
        save_analysis_record("URL", "https://example.com", AnalysisResult(status="SAFE", risk_score=10, threat_category="No significant structural threat detected", explanation="ok", recommended_action="continue", indicators=[]))
        save_analysis_record("MESSAGE", "Urgent payment alert", AnalysisResult(status="DANGEROUS", risk_score=90, threat_category="High-risk phishing or social-engineering message", explanation="danger", recommended_action="report", indicators=[]))
        records = get_history_records(search="payment", status_filter="DANGEROUS", type_filter="MESSAGE", sort="newest")
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0].analysis_type, "MESSAGE")

    def test_delete_history_works(self):
        save_analysis_record("URL", "https://example.com", AnalysisResult(status="SAFE", risk_score=10, threat_category="No significant structural threat detected", explanation="ok", recommended_action="continue", indicators=[]))
        delete_all_analyses()
        records = get_history_records()
        self.assertEqual(len(records), 0)


if __name__ == "__main__":
    unittest.main()
