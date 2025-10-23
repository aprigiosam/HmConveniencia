"""
Integração simples com a API pública do Open Food Facts.
"""

from __future__ import annotations

import logging
import re
from decimal import Decimal, InvalidOperation
from typing import Dict, List, Optional, Tuple

import httpx
from django.conf import settings
from django.core.cache import cache


logger = logging.getLogger(__name__)

SEARCH_ENDPOINT = "https://world.openfoodfacts.org/cgi/search.pl"
PRODUCT_ENDPOINT = "https://world.openfoodfacts.org/api/v2/product/{code}.json"
USER_AGENT = getattr(
    settings,
    "OPENFOODFACTS_USER_AGENT",
    "HMConveniencia/1.0 (+https://hmconveniencia.example)",
)

DEFAULT_TIMEOUT = getattr(settings, "OPENFOODFACTS_TIMEOUT", 5.0)
CACHE_TTL = getattr(settings, "OPENFOODFACTS_CACHE_SECONDS", 60 * 60 * 6)  # 6h


class OpenFoodFactsError(Exception):
    """Erros provenientes da API do Open Food Facts."""


def search_products(
    term: str, *, page: int = 1, page_size: int = 10
) -> List[Dict[str, Optional[str]]]:
    """
    Busca produtos por termo livre.
    Limita o tamanho da resposta e normaliza os campos utilizados na interface.
    """
    if not term:
        return []

    page = max(1, page)
    page_size = max(1, min(page_size, 25))
    cache_key = f"openfoodfacts:search:{term}:{page}:{page_size}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    params = {
        "search_terms": term,
        "search_simple": 1,
        "action": "process",
        "json": 1,
        "page": page,
        "page_size": page_size,
    }

    try:
        response = httpx.get(
            SEARCH_ENDPOINT,
            params=params,
            timeout=DEFAULT_TIMEOUT,
            headers={"User-Agent": USER_AGENT},
        )
    except httpx.HTTPError as exc:  # noqa: BLE001
        logger.warning("Falha na requisição ao Open Food Facts: %s", exc)
        raise OpenFoodFactsError("Não foi possível consultar o Open Food Facts.") from exc

    if response.status_code != 200:
        logger.warning(
            "Open Food Facts retornou status %s na busca por '%s'",
            response.status_code,
            term,
        )
        raise OpenFoodFactsError("Serviço Open Food Facts indisponível no momento.")

    try:
        payload = response.json()
    except ValueError as exc:  # noqa: BLE001
        logger.exception("Resposta inválida do Open Food Facts.")
        raise OpenFoodFactsError("Resposta inválida do Open Food Facts.") from exc

    products = payload.get("products") or []
    normalized: List[Dict[str, Optional[str]]] = []
    for product in products:
        normalised_product = _normalise_product(product)
        if normalised_product is not None:
            normalized.append(normalised_product)
    cache.set(cache_key, normalized, CACHE_TTL)
    return normalized


def fetch_by_code(code: str) -> Optional[Dict[str, Optional[str]]]:
    """
    Recupera um produto específico a partir do GTIN/EAN.
    """
    if not code:
        return None

    cache_key = f"openfoodfacts:code:{code}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        response = httpx.get(
            PRODUCT_ENDPOINT.format(code=code),
            timeout=DEFAULT_TIMEOUT,
            headers={"User-Agent": USER_AGENT},
        )
    except httpx.HTTPError as exc:  # noqa: BLE001
        logger.warning("Falha ao buscar produto %s no Open Food Facts: %s", code, exc)
        raise OpenFoodFactsError("Não foi possível consultar o Open Food Facts.") from exc

    if response.status_code == 404:
        cache.set(cache_key, None, CACHE_TTL)
        return None

    if response.status_code != 200:
        logger.warning(
            "Open Food Facts retornou status %s ao buscar código %s",
            response.status_code,
            code,
        )
        raise OpenFoodFactsError("Serviço Open Food Facts indisponível no momento.")

    try:
        payload = response.json()
    except ValueError as exc:  # noqa: BLE001
        logger.exception("Resposta inválida do Open Food Facts para código %s.", code)
        raise OpenFoodFactsError("Resposta inválida do Open Food Facts.") from exc

    product = payload.get("product")
    normalized = _normalise_product(product) if product else None
    cache.set(cache_key, normalized, CACHE_TTL)
    return normalized


def _normalise_product(product: Optional[dict]) -> Optional[Dict[str, Optional[str]]]:
    if not product:
        return None

    code = str(product.get("code") or "").strip()
    nome = _coalesce(
        product.get("product_name"),
        product.get("generic_name"),
        product.get("product_name_en"),
    )
    if not code and not nome:
        return None

    brand = _coalesce(*_split_by_comma(product.get("brands")))

    categories_list = _split_by_comma(product.get("categories"))
    category_suggestion = _extract_category_suggestion(product, categories_list)

    normalized = {
        "code": code or None,
        "name": nome or None,
        "brand": brand or None,
        "quantity": _coalesce(product.get("quantity"), product.get("serving_size")),
        "categories": categories_list,
        "image_small_url": product.get("image_small_url")
        or product.get("image_front_small_url"),
        "image_url": product.get("image_url") or product.get("image_front_url"),
        "nutriscore_grade": product.get("nutriscore_grade"),
        "ecoscore_grade": product.get("ecoscore_grade"),
        "data_source": "Open Food Facts",
        "category_suggestion": category_suggestion,
    }
    quantity_value, quantity_unit = _parse_quantity(normalized["quantity"])
    normalized["quantity_value"] = quantity_value
    normalized["quantity_unit"] = quantity_unit
    return normalized


def _split_by_comma(value: Optional[str]) -> List[str]:
    if not value:
        return []
    return [part.strip() for part in value.split(",") if part.strip()]


def _coalesce(*values: Optional[str]) -> Optional[str]:
    for value in values:
        if value:
            value = str(value).strip()
            if value:
                return value
    return None


def _parse_quantity(quantity: Optional[str]) -> Tuple[Optional[float], Optional[str]]:
    if not quantity:
        return None, None

    texto = str(quantity).strip()
    match = re.match(r"(?P<valor>[\d,.]+)\s*(?P<unidade>[a-zA-Zµμ]+)", texto)
    if not match:
        return None, None

    valor_str = match.group("valor").replace(",", ".")
    unidade = match.group("unidade").lower()
    try:
        valor = Decimal(valor_str)
    except (InvalidOperation, ValueError):
        return None, unidade
    return float(valor), unidade


def _extract_category_suggestion(
    product: Optional[dict], categories_list: List[str]
) -> Optional[str]:
    def _clean_label(label: str) -> str:
        label = label.replace("_", " ").replace("-", " ").strip()
        if not label:
            return ""
        return label[:1].upper() + label[1:]

    if not product:
        return None

    categories_tags = product.get("categories_tags") or []
    for tag in categories_tags:
        if not tag:
            continue
        label = tag.split(":")[-1]
        cleaned = _clean_label(label)
        if cleaned:
            return cleaned

    for category in categories_list:
        cleaned = _clean_label(category)
        if cleaned:
            return cleaned

    categories_hierarchy = product.get("categories_hierarchy") or []
    for entry in categories_hierarchy:
        if not entry:
            continue
        label = entry.split(":")[-1]
        cleaned = _clean_label(label)
        if cleaned:
            return cleaned

    return None
