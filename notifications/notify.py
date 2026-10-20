"""
Prapti-AI Central Notification Dispatcher
Implements the 4 core lifecycle events defined in docs/api-contract.md:
  1. match_found: Sent to lost-item owner when AI matches an item
  2. claim_received: Sent to finder when someone answers the secret question
  3. handover_ready: Sent to both parties with QR handover pass
  4. returned: Sent to both parties confirming handover completion
"""

import logging
from typing import Dict, Any, Optional
from notifications.email_sender import send_email

logger = logging.getLogger("prapti.notifications.dispatcher")


def _render_base_template(title: str, badge: str, badge_color: str, body_html: str, action_url: Optional[str] = None, action_label: Optional[str] = None) -> str:
    """Renders a responsive, modern HTML email template with Prapti-AI branding."""
    action_button = ""
    if action_url and action_label:
        action_button = f"""
        <div style="margin: 28px 0; text-align: center;">
          <a href="{action_url}" style="background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
            {action_label} &rarr;
          </a>
        </div>
        """

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>{title}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #e2e8f0; margin: 0; padding: 24px;">
      <div style="max-width: 580px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); padding: 24px 32px; border-bottom: 1px solid #334155;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
              Prapti<span style="color: #6366f1;">-AI</span>
            </h1>
            <span style="font-size: 11px; background-color: {badge_color}; color: #ffffff; padding: 3px 10px; border-radius: 9999px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
              {badge}
            </span>
          </div>
          <p style="margin: 6px 0 0; font-size: 12px; color: #94a3b8;">
            Dayananda Sagar College of Engineering — Smart Campus Lost & Found
          </p>
        </div>

        <!-- Body -->
        <div style="padding: 32px;">
          <h2 style="margin: 0 0 16px; font-size: 18px; color: #f8fafc; font-weight: 600;">{title}</h2>
          {body_html}
          {action_button}
        </div>

        <!-- Footer -->
        <div style="padding: 16px 32px; background-color: #0f172a; border-top: 1px solid #334155; text-align: center; font-size: 11px; color: #64748b;">
          Prapti-AI Automated Notification Engine • Secure Campus Network<br>
          Please do not reply directly to this automated email.
        </div>
      </div>
    </body>
    </html>
    """


def notify(event: str, recipient: Dict[str, Any], data: Dict[str, Any]) -> bool:
    """
    Main notification dispatcher conforming to docs/api-contract.md:
      backend calls notify(event, recipient, data)

    Supported Events:
      - 'match_found': High-confidence match found for lost item report
      - 'claim_received': Claimant submitted secret answer
      - 'handover_ready': QR token generated and ready for exchange
      - 'returned': Handover completed by finder or admin
    """
    to_email = recipient.get("email")
    if not to_email:
        logger.warning(f"Notification skipped for event '{event}': No email in recipient object: {recipient}")
        return False

    recipient_name = recipient.get("full_name") or recipient.get("name") or "Student"
    frontend_base = "http://localhost:3000"

    try:
        if event == "match_found":
            item_category = data.get("category", "Item").capitalize()
            score_pct = int(float(data.get("score", 0.85)) * 100)
            location_name = data.get("location_name") or data.get("location_id", "Campus Grounds")
            description = data.get("description") or "No description provided."

            subject = f"🎯 [Match Alert {score_pct}%] Your lost {item_category} may have been found!"
            badge = f"{score_pct}% AI Match"
            badge_color = "#10b981" if score_pct >= 85 else "#f59e0b"

            body_html = f"""
            <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
              Hello <strong>{recipient_name}</strong>,<br><br>
              Great news! Prapti-AI's multimodal computer vision engine just matched a newly reported found item with your lost report.
            </p>

            <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 18px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #cbd5e1;">
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8; width: 35%;">Item Category:</td>
                  <td style="padding: 6px 0; font-weight: 600; color: #f8fafc;">{item_category}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8;">Location Found:</td>
                  <td style="padding: 6px 0; font-weight: 600; color: #38bdf8;">📍 {location_name}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8;">AI Confidence:</td>
                  <td style="padding: 6px 0; font-weight: 700; color: {badge_color};">{score_pct}%</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94a3b8;">Details:</td>
                  <td style="padding: 6px 0; color: #e2e8f0;">{description}</td>
                </tr>
              </table>
            </div>

            <p style="font-size: 13px; line-height: 1.5; color: #94a3b8;">
              To protect your privacy and ensure safe retrieval, you can answer the finder's secret security question on your dashboard.
            </p>
            """

            text_content = f"Prapti-AI Match Found!\nCategory: {item_category}\nLocation: {location_name}\nConfidence: {score_pct}%\nLog in to review and claim your item: {frontend_base}/items"
            html_content = _render_base_template(
                title=f"Potential Match Found: {item_category}",
                badge=badge,
                badge_color=badge_color,
                body_html=body_html,
                action_url=f"{frontend_base}/items",
                action_label="Review & Claim Item"
            )
            return send_email(to_email, subject, html_content, text_content, recipient_name)

        elif event == "claim_received":
            item_category = data.get("category", "Item").capitalize()
            subject = f"🔐 New Ownership Claim on Your Found {item_category}"

            body_html = f"""
            <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
              Hello <strong>{recipient_name}</strong>,<br><br>
              A student has initiated an ownership claim for the <strong>{item_category}</strong> you reported finding.
            </p>
            <p style="font-size: 13px; line-height: 1.6; color: #94a3b8;">
              Our anti-theft protocol is currently verifying their answer against the secret question you set. You will receive an immediate notification once verification succeeds.
            </p>
            """
            text_content = f"Prapti-AI: A claim has been initiated for the found {item_category}."
            html_content = _render_base_template(
                title="New Ownership Claim Received",
                badge="Claim Pending",
                badge_color="#6366f1",
                body_html=body_html,
                action_url=f"{frontend_base}/items",
                action_label="View Found Items"
            )
            return send_email(to_email, subject, html_content, text_content, recipient_name)

        elif event == "handover_ready":
            item_category = data.get("category", "Item").capitalize()
            role_hint = data.get("role_hint", "student")
            qr_token = data.get("qr_token", "")

            subject = f"🤝 Handover Ready: Secret Verified for {item_category}!"
            body_html = f"""
            <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
              Hello <strong>{recipient_name}</strong>,<br><br>
              Ownership verification was <strong>successful</strong>! The anti-theft secret question was answered correctly.
            </p>

            <div style="background-color: #0f172a; border: 1px solid #10b981; border-radius: 8px; padding: 18px; margin: 20px 0; text-align: center;">
              <span style="font-size: 12px; color: #10b981; font-weight: 700; text-transform: uppercase;">Single-Use Handover Pass</span>
              <div style="font-family: monospace; font-size: 18px; font-weight: 700; color: #f8fafc; letter-spacing: 2px; margin: 12px 0;">
                {qr_token[:12]}...
              </div>
              <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                Show or scan this QR/code during the in-person campus handover.
              </p>
            </div>

            <p style="font-size: 13px; line-height: 1.5; color: #94a3b8;">
              Please arrange to meet in a public campus location (e.g., Campus Security Gate 1 or Central Library).
            </p>
            """
            text_content = f"Prapti-AI Handover Ready!\nItem: {item_category}\nVerification: SUCCESS\nPass Token: {qr_token}\nDashboard: {frontend_base}/items"
            html_content = _render_base_template(
                title="Handover Pass Ready",
                badge="Verified",
                badge_color="#10b981",
                body_html=body_html,
                action_url=f"{frontend_base}/items",
                action_label="Open Handover Pass"
            )
            return send_email(to_email, subject, html_content, text_content, recipient_name)

        elif event == "returned":
            item_category = data.get("category", "Item").capitalize()
            subject = f"✅ Handover Complete: {item_category} Returned"

            body_html = f"""
            <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
              Hello <strong>{recipient_name}</strong>,<br><br>
              The handover for <strong>{item_category}</strong> has been officially confirmed and recorded!
            </p>
            <p style="font-size: 13px; line-height: 1.5; color: #10b981; font-weight: 600;">
              ✨ Thank you for using Prapti-AI and helping keep the Dayananda Sagar College of Engineering campus community connected!
            </p>
            """
            text_content = f"Prapti-AI: Handover complete for {item_category}. Status updated to RETURNED."
            html_content = _render_base_template(
                title="Item Successfully Returned",
                badge="Completed",
                badge_color="#10b981",
                body_html=body_html,
                action_url=f"{frontend_base}/items",
                action_label="View Records"
            )
            return send_email(to_email, subject, html_content, text_content, recipient_name)

        else:
            logger.warning(f"Unknown notification event: {event}")
            return False

    except Exception as e:
        logger.error(f"Error dispatching notification for event '{event}': {e}", exc_info=True)
        return False


def notify_user_by_id(event: str, user_id: str, data: Dict[str, Any], supabase_client=None) -> bool:
    """
    Convenience helper that looks up a student's profile by UUID and calls notify().
    Safe against missing profiles or lookup errors.
    """
    if not user_id:
        return False
    try:
        if supabase_client is None:
            from backend.app.db import get_supabase_admin
            supabase_client = get_supabase_admin()

        res = (
            supabase_client.table("profiles")
            .select("id, email, full_name")
            .eq("id", str(user_id))
            .maybe_single()
            .execute()
        )
        profile = res.data if res else None
        if not profile or not profile.get("email"):
            # Try mock or fallback email if in dev mode
            logger.info(f"No profile found for user_id={user_id}. Attempting fallback.")
            return False

        return notify(event, profile, data)
    except Exception as e:
        logger.warning(f"Failed to lookup profile for notification (user_id={user_id}): {e}")
        return False
