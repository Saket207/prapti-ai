"""
Prapti-AI Central Notification Dispatcher
Official Email Engine for Dayananda Sagar College of Engineering (DSCE), Bengaluru.
Implements the 4 core lifecycle events defined in docs/api-contract.md:
  1. match_found: Sent to lost-item owner when AI matches an item
  2. claim_received: Sent to finder when someone answers the secret question
  3. handover_ready: Sent to both parties with QR handover pass
  4. returned: Sent to both parties confirming handover completion
"""

from datetime import datetime, timezone
import logging
from typing import Dict, Any, Optional
from notifications.email_sender import send_email

logger = logging.getLogger("prapti.notifications.dispatcher")


def _render_official_template(
    subject: str,
    recipient_name: Optional[str],
    heading: str,
    message_text: str,
    reason_line: str,
    category: str,
    location: str,
    event_time: str,
    status_badge: str,
    action_url: str,
    button_label: str,
) -> str:
    """
    Renders the official reusable DSCE college email template.
    Strictly email-safe: HTML tables, inline styles, max-width 580px,
    bulletproof buttons (VML for Outlook), high contrast, and accessible.
    """
    safe_name = recipient_name if recipient_name and recipient_name.strip() else "Student"

    return f"""<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">

  <!-- Outer Canvas Table (600px max width) -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 32px 12px;">
    <tr>
      <td align="center">
        
        <!-- Main Card Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 10px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Official Institutional Header Bar -->
          <tr>
            <td style="background-color: #1e1b4b; padding: 22px 30px; border-bottom: 3px solid #4f46e5;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <!-- Sanskrit Glyph Logo Badge -->
                  <td width="42" valign="middle">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="width: 38px; height: 38px; background: linear-gradient(135deg, #06b6d4, #4f46e5); border-radius: 8px; font-weight: 800; font-size: 19px; color: #ffffff; line-height: 38px;">
                          प्रा
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- Title and DSCE Affiliation -->
                  <td style="padding-left: 14px;" valign="middle">
                    <div style="font-size: 18px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px; line-height: 22px;">
                      Prapti-AI <span style="font-size: 13px; font-weight: 600; color: #38bdf8; background-color: #0c4a6e; padding: 2px 8px; border-radius: 4px; margin-left: 6px;">DSCE</span>
                    </div>
                    <div style="font-size: 11px; color: #cbd5e1; margin-top: 3px; font-weight: 400; letter-spacing: 0.2px;">
                      Dayananda Sagar College of Engineering, Bengaluru
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Email Body Content -->
          <tr>
            <td style="padding: 32px 30px;">
              
              <!-- Recipient Greeting with Fallback -->
              <p style="margin: 0 0 16px; font-size: 15px; color: #475569; line-height: 22px;">
                Dear <strong>{safe_name}</strong>,
              </p>

              <!-- Main Heading -->
              <h1 style="margin: 0 0 12px; font-size: 20px; font-weight: 700; color: #0f172a; line-height: 26px;">
                {heading}
              </h1>

              <!-- Explanatory Friendly Text -->
              <p style="margin: 0 0 14px; font-size: 14px; color: #334155; line-height: 22px;">
                {message_text}
              </p>

              <!-- Why They Received This Line -->
              <p style="margin: 0 0 24px; font-size: 12px; color: #64748b; line-height: 18px; background-color: #f8fafc; padding: 8px 12px; border-radius: 6px; border-left: 3px solid #6366f1;">
                ℹ️ <strong>Why you received this:</strong> {reason_line}
              </p>

              <!-- Structured Details Box -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px;">
                      
                      <!-- Row: Item Category -->
                      <tr>
                        <td width="38%" style="padding: 6px 0; color: #64748b; font-weight: 500;">Item Category</td>
                        <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">{category}</td>
                      </tr>

                      <!-- Row: Location -->
                      <tr>
                        <td style="padding: 6px 0; color: #64748b; font-weight: 500; border-top: 1px solid #edf2f7;">Campus Location</td>
                        <td style="padding: 6px 0; color: #0284c7; font-weight: 600; border-top: 1px solid #edf2f7;">📍 {location}</td>
                      </tr>

                      <!-- Row: Date / Time -->
                      <tr>
                        <td style="padding: 6px 0; color: #64748b; font-weight: 500; border-top: 1px solid #edf2f7;">Event Time</td>
                        <td style="padding: 6px 0; color: #334155; border-top: 1px solid #edf2f7;">{event_time}</td>
                      </tr>

                      <!-- Row: Status / Extra Detail (Strict privacy: zero secrets) -->
                      <tr>
                        <td style="padding: 6px 0; color: #64748b; font-weight: 500; border-top: 1px solid #edf2f7;">Record Status</td>
                        <td style="padding: 6px 0; color: #16a34a; font-weight: 700; border-top: 1px solid #edf2f7;">{status_badge}</td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>

              <!-- Bulletproof Call-to-Action Button (Works in Outlook & Mobile) -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{action_url}" style="height:44px;v-text-anchor:middle;width:240px;" arcsize="16%" stroke="f" fillcolor="#4f46e5">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:bold;">{button_label} &rarr;</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="{action_url}" target="_blank" style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 7px; text-align: center;">
                      {button_label} &rarr;
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>

              <!-- Fallback Plain Text Link -->
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 16px; text-align: center;">
                Button not working? Copy and paste this URL into your browser:<br />
                <a href="{action_url}" style="color: #4f46e5; word-break: break-all; text-decoration: underline;">{action_url}</a>
              </p>

            </td>
          </tr>

          <!-- Official Institutional Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 22px 30px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; line-height: 18px;">
              <strong>Prapti-AI • Campus Lost & Found System</strong><br />
              Dayananda Sagar College of Engineering (DSCE), Bengaluru — 560078<br />
              Need assistance? Contact Campus Security & Helpdesk at <a href="mailto:lostfound@dsce.edu.in" style="color: #4f46e5; text-decoration: none;">lostfound@dsce.edu.in</a><br />
              <span style="font-size: 11px; color: #94a3b8; display: inline-block; margin-top: 8px;">
                This is an automated official institutional message. Please do not reply directly to this email.
              </span>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>"""


def _render_plain_text(
    recipient_name: Optional[str],
    heading: str,
    message_text: str,
    reason_line: str,
    category: str,
    location: str,
    event_time: str,
    status_badge: str,
    action_url: str,
) -> str:
    """Renders accessible, clean plain-text version of the institutional email."""
    safe_name = recipient_name if recipient_name and recipient_name.strip() else "Student"
    return f"""======================================================================
Prapti-AI | Dayananda Sagar College of Engineering (DSCE), Bengaluru
======================================================================

Dear {safe_name},

{heading}

{message_text}

Why you received this: {reason_line}

----------------------------------------------------------------------
ITEM DETAILS:
- Category:    {category}
- Location:    {location}
- Event Time:  {event_time}
- Status:      {status_badge}
----------------------------------------------------------------------

To proceed, visit your dashboard at:
{action_url}

======================================================================
Prapti-AI • Campus Lost & Found System
Dayananda Sagar College of Engineering (DSCE), Bengaluru - 560078
Support: lostfound@dsce.edu.in
This is an automated institutional message. Do not reply directly.
======================================================================
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
    current_time_str = datetime.now(timezone.utc).strftime("%d %b %Y, %I:%M %p UTC")

    try:
        if event == "match_found":
            item_category = data.get("category", "Item").capitalize()
            score_pct = int(float(data.get("score", 0.85)) * 100)
            location_name = data.get("location_name") or data.get("location_id", "Campus Grounds")

            subject = f"🎯 [Match Alert {score_pct}%] Potential match found for your lost {item_category} | DSCE"
            heading = f"Potential Match Found for Your Lost {item_category}"
            message_text = f"Prapti-AI's campus vision engine has identified a newly reported found item that closely matches the lost report you filed."
            reason_line = "A newly reported found item matches your active lost item report above the 65% campus threshold."
            status_badge = f"{score_pct}% Match (High Confidence)"
            action_url = f"{frontend_base}/items"
            button_label = "Review & Verify Ownership"

            html_content = _render_official_template(
                subject=subject,
                recipient_name=recipient_name,
                heading=heading,
                message_text=message_text,
                reason_line=reason_line,
                category=item_category,
                location=location_name,
                event_time=current_time_str,
                status_badge=status_badge,
                action_url=action_url,
                button_label=button_label,
            )
            text_content = _render_plain_text(
                recipient_name=recipient_name,
                heading=heading,
                message_text=message_text,
                reason_line=reason_line,
                category=item_category,
                location=location_name,
                event_time=current_time_str,
                status_badge=status_badge,
                action_url=action_url,
            )
            return send_email(to_email, subject, html_content, text_content, recipient_name)

        elif event == "claim_received":
            item_category = data.get("category", "Item").capitalize()
            location_name = data.get("location_name") or data.get("location_id", "Campus Grounds")

            subject = f"🔐 New Ownership Claim on Found {item_category} | DSCE"
            heading = f"Ownership Claim Initiated on Found {item_category}"
            message_text = "A student has submitted an ownership claim for the item you found on campus. Our anti-theft protocol is verifying their security details."
            reason_line = "You are the registered finder of this item on the Prapti-AI campus registry."
            status_badge = "Claim Pending Verification"
            action_url = f"{frontend_base}/items"
            button_label = "View Item Status"

            html_content = _render_official_template(
                subject=subject,
                recipient_name=recipient_name,
                heading=heading,
                message_text=message_text,
                reason_line=reason_line,
                category=item_category,
                location=location_name,
                event_time=current_time_str,
                status_badge=status_badge,
                action_url=action_url,
                button_label=button_label,
            )
            text_content = _render_plain_text(
                recipient_name=recipient_name,
                heading=heading,
                message_text=message_text,
                reason_line=reason_line,
                category=item_category,
                location=location_name,
                event_time=current_time_str,
                status_badge=status_badge,
                action_url=action_url,
            )
            return send_email(to_email, subject, html_content, text_content, recipient_name)

        elif event == "handover_ready":
            item_category = data.get("category", "Item").capitalize()
            location_name = data.get("location_name") or data.get("location_id", "Campus Grounds")

            subject = f"🤝 Handover Pass Ready for {item_category} | DSCE"
            heading = f"Verification Complete — Handover Pass Ready"
            message_text = "The ownership secret challenge has been verified! Both parties may now proceed to complete the physical handover on campus."
            reason_line = "Ownership verification succeeded. Your single-use handover pass is now ready on your portal."
            status_badge = "Verified & Handover Ready"
            action_url = f"{frontend_base}/items"
            button_label = "Open Handover Pass & QR Token"

            html_content = _render_official_template(
                subject=subject,
                recipient_name=recipient_name,
                heading=heading,
                message_text=message_text,
                reason_line=reason_line,
                category=item_category,
                location=location_name,
                event_time=current_time_str,
                status_badge=status_badge,
                action_url=action_url,
                button_label=button_label,
            )
            text_content = _render_plain_text(
                recipient_name=recipient_name,
                heading=heading,
                message_text=message_text,
                reason_line=reason_line,
                category=item_category,
                location=location_name,
                event_time=current_time_str,
                status_badge=status_badge,
                action_url=action_url,
            )
            return send_email(to_email, subject, html_content, text_content, recipient_name)

        elif event == "returned":
            item_category = data.get("category", "Item").capitalize()
            location_name = data.get("location_name") or data.get("location_id", "Campus Grounds")

            subject = f"✅ Item Successfully Returned: {item_category} | DSCE"
            heading = f"Handover Confirmed — Case Successfully Closed"
            message_text = "The physical handover for this item was confirmed with the single-use cryptographic token. The record has been permanently marked as Returned."
            reason_line = "The verified handover for your campus lost-and-found report has concluded."
            status_badge = "Returned & Closed"
            action_url = f"{frontend_base}/items"
            button_label = "View Closed Records"

            html_content = _render_official_template(
                subject=subject,
                recipient_name=recipient_name,
                heading=heading,
                message_text=message_text,
                reason_line=reason_line,
                category=item_category,
                location=location_name,
                event_time=current_time_str,
                status_badge=status_badge,
                action_url=action_url,
                button_label=button_label,
            )
            text_content = _render_plain_text(
                recipient_name=recipient_name,
                heading=heading,
                message_text=message_text,
                reason_line=reason_line,
                category=item_category,
                location=location_name,
                event_time=current_time_str,
                status_badge=status_badge,
                action_url=action_url,
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
            logger.info(f"No profile found for user_id={user_id}. Attempting fallback.")
            return False

        return notify(event, profile, data)
    except Exception as e:
        logger.warning(f"Failed to lookup profile for notification (user_id={user_id}): {e}")
        return False
