import logging
from dataclasses import dataclass
from typing import Optional

from decouple import config
from twilio.base.exceptions import TwilioRestException
from twilio.rest import Client

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class WhatsappSettings:
    enabled: bool = config("WHATSAPP_ENABLED", default=False, cast=bool)
    account_sid: str = config("WHATSAPP_ACCOUNT_SID", default="")
    auth_token: str = config("WHATSAPP_AUTH_TOKEN", default="")
    from_number: str = config("WHATSAPP_FROM_NUMBER", default="")
    default_to_number: str = config("WHATSAPP_DEFAULT_TO_NUMBER", default="")

    @property
    def is_configured(self) -> bool:
        return (
            self.enabled
            and bool(self.account_sid)
            and bool(self.auth_token)
            and bool(self.from_number)
        )


class WhatsappNotifier:
    """Wrapper simples para envio de alertas via WhatsApp (Twilio)."""

    settings = WhatsappSettings()

    @classmethod
    def send_alert(cls, alerta) -> bool:
        if not cls.settings.is_configured:
            logger.debug("WhatsApp desabilitado ou não configurado.")
            return False

        destinatario = cls._resolve_destinatario(alerta)
        if not destinatario:
            logger.warning(
                "Não foi possível determinar o telefone de destino para o alerta %s",
                alerta.id,
            )
            return False

        to_number = cls._format_number(destinatario)
        if not to_number:
            logger.warning(
                "Telefone inválido para alerta %s: %s", alerta.id, destinatario
            )
            return False

        from_number = cls._ensure_whatsapp_prefix(cls.settings.from_number)
        mensagem = cls._montar_mensagem(alerta)

        try:
            client = Client(cls.settings.account_sid, cls.settings.auth_token)
            client.messages.create(
                from_=from_number,
                to=to_number,
                body=mensagem,
            )
            logger.info(
                "Alerta %s enviado via WhatsApp para %s", alerta.id, to_number
            )
            return True
        except TwilioRestException as exc:
            logger.exception("Falha ao enviar alerta %s via WhatsApp: %s", alerta.id, exc)
            return False
        except Exception as exc:  # noqa: BLE001
            logger.exception(
                "Erro inesperado ao enviar alerta %s via WhatsApp: %s", alerta.id, exc
            )
            return False

    @classmethod
    def _resolve_destinatario(cls, alerta) -> Optional[str]:
        empresa = getattr(alerta, "empresa", None)
        if not empresa and alerta.produto_id:
            empresa = getattr(alerta.produto, "empresa", None)
        if not empresa and alerta.cliente_id:
            empresa = getattr(alerta.cliente, "empresa", None)

        telefone = getattr(empresa, "telefone_contato", None) if empresa else None
        if telefone:
            return telefone

        # fallback global
        return cls.settings.default_to_number

    @classmethod
    def _format_number(cls, raw: Optional[str]) -> Optional[str]:
        if not raw:
            return None

        cleaned = "".join(ch for ch in raw if ch.isdigit() or ch == "+")
        if not cleaned:
            return None

        if cleaned.startswith("+"):
            digits = "+" + "".join(filter(str.isdigit, cleaned))
        else:
            digits = "".join(filter(str.isdigit, cleaned))
            if len(digits) == 0:
                return None
            # Assume Brasil se não vier código do país
            if len(digits) <= 11:
                digits = "+55" + digits
            else:
                digits = "+" + digits

        return cls._ensure_whatsapp_prefix(digits)

    @staticmethod
    def _ensure_whatsapp_prefix(number: str) -> str:
        return number if number.startswith("whatsapp:") else f"whatsapp:{number}"

    @staticmethod
    def _montar_mensagem(alerta) -> str:
        linhas = [
            f"*{alerta.titulo}*",
            alerta.mensagem,
        ]
        if alerta.created_at:
            linhas.append(f"\nGerado em: {alerta.created_at.strftime('%d/%m/%Y %H:%M')}")
        return "\n".join(linhas)
