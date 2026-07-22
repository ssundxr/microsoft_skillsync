import os
import logging
from azure.communication.email import EmailClient
from twilio.rest import Client

logger = logging.getLogger(__name__)

class NotificationService:
    @staticmethod
    def send_otp(email: str, phone: str | None, otp: str):
        # --- EMAIL via Azure ACS ---
        acs_conn_str = os.getenv("ACS_CONNECTION_STRING")
        if acs_conn_str:
            try:
                email_client = EmailClient.from_connection_string(acs_conn_str)
                sender_email = os.getenv("ACS_SENDER_EMAIL", "donotreply@yourdomain.com")
                
                message = {
                    "senderAddress": sender_email,
                    "recipients":  {
                        "to": [{"address": email}],
                    },
                    "content": {
                        "subject": "Your SkillSync Candidate OTP",
                        "plainText": f"Welcome to the portal! Your OTP is: {otp}\n\nPlease enter this code to verify your account.",
                    }
                }
                
                email_client.begin_send(message)
                logger.info(f"ACS Email initiated to {email}")
                print(f"[LIVE ACS API] OTP Email initiated to {email}")
            except Exception as e:
                logger.error(f"Failed to send ACS email to {email}: {str(e)}")
        else:
            logger.warning(f"No ACS_CONNECTION_STRING found. Simulated OTP Email for {email}: {otp}")
            print(f"[SIMULATED ACS EMAIL] OTP: {otp}")

        # --- SMS via Twilio ---
        if phone:
            tw_sid = os.getenv("TWILIO_ACCOUNT_SID")
            tw_token = os.getenv("TWILIO_AUTH_TOKEN")
            tw_phone = os.getenv("TWILIO_PHONE_NUMBER")
            
            if tw_sid and tw_token and tw_phone:
                try:
                    if not phone.startswith("+"):
                        phone = "+" + phone.lstrip("0")
                        
                    client = Client(tw_sid, tw_token)
                    client.messages.create(
                        body=f"Your SkillSync OTP is: {otp}",
                        from_=tw_phone,
                        to=phone
                    )
                    logger.info(f"Twilio SMS initiated to {phone}")
                    print(f"[LIVE TWILIO API] OTP SMS initiated to {phone}")
                except Exception as e:
                    logger.error(f"Failed to send Twilio SMS to {phone}: {str(e)}")
            else:
                logger.warning(f"Missing Twilio vars. Simulated OTP SMS for {phone}: {otp}")
                print(f"[SIMULATED TWILIO SMS] OTP: {otp}")

    @staticmethod
    def send_proctor_code(email: str, name: str, job_title: str, code: str):
        # Email Delivery
        acs_conn_str = os.getenv("ACS_CONNECTION_STRING")
        if acs_conn_str:
            try:
                email_client = EmailClient.from_connection_string(acs_conn_str)
                sender_email = os.getenv("ACS_SENDER_EMAIL", "donotreply@yourdomain.com")
                
                # Ensure sender_email is a full address
                if "@" not in sender_email:
                    sender_email = f"DoNotReply@{sender_email}"
                
                message = {
                    "senderAddress": sender_email,
                    "recipients": {"to": [{"address": email}]},
                    "content": {
                        "subject": f"Required: Assessment Access Code for {job_title}",
                        "plainText": (
                            f"Hi {name},\n\n"
                            f"Thanks for applying for the {job_title} position at SkillSync. We are excited to proceed with your candidacy.\n\n"
                            f"To move forward, please use the following Proctor Code to unlock your assessment:\n"
                            f"CODE: {code}\n\n"
                            "Hope you do well on the assessment! If you encounter any technical issues, please reach out to our support team.\n\n"
                            "Best regards,\n"
                            "The SkillSync Team"
                        ),
                    }
                }
                email_client.begin_send(message)
                logger.info(f"ACS Email initiated for Proctor Code to {email}")
                print(f"[LIVE ACS API] Proctor Code Email sent to {email}")
            except Exception as e:
                logger.error(f"Failed to send Proctor Code email to {email}: {str(e)}")
        else:
            logger.warning(f"No ACS_CONNECTION_STRING found. Simulated Proctor Email for {email}: {code}")
            print(f"[SIMULATED EMAIL] Hi {name}, job: {job_title}, Proctor Code: {code}")
