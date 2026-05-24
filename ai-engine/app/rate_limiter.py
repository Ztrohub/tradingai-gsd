from __future__ import annotations

import threading
import time
from collections import deque


class RateLimiter:
    def __init__(self, rpm: int, rpd: int, tpm: int, tpd: int, min_interval_seconds: float = 2.1) -> None:
        self.rpm = rpm
        self.rpd = rpd
        self.tpm = tpm
        self.tpd = tpd
        self.min_interval_seconds = min_interval_seconds
        self._request_minute: deque[float] = deque()
        self._tokens_minute: deque[tuple[float, int]] = deque()
        self._request_day: deque[float] = deque()
        self._tokens_day: deque[tuple[float, int]] = deque()
        self._last_request_at = 0.0
        self._lock = threading.Lock()

    def _prune(self, now: float) -> None:
        minute_cutoff = now - 60
        day_cutoff = now - 86_400

        while self._request_minute and self._request_minute[0] <= minute_cutoff:
            self._request_minute.popleft()
        while self._tokens_minute and self._tokens_minute[0][0] <= minute_cutoff:
            self._tokens_minute.popleft()
        while self._request_day and self._request_day[0] <= day_cutoff:
            self._request_day.popleft()
        while self._tokens_day and self._tokens_day[0][0] <= day_cutoff:
            self._tokens_day.popleft()

    def _minute_tokens(self) -> int:
        return sum(tokens for _, tokens in self._tokens_minute)

    def _day_tokens(self) -> int:
        return sum(tokens for _, tokens in self._tokens_day)

    def acquire(self, estimated_tokens: int) -> None:
        estimated_tokens = max(1, estimated_tokens)
        while True:
            with self._lock:
                now = time.time()
                self._prune(now)

                sleep_for = 0.0
                if self._last_request_at:
                    sleep_for = max(sleep_for, self.min_interval_seconds - (now - self._last_request_at))
                if len(self._request_minute) >= self.rpm:
                    sleep_for = max(sleep_for, 60 - (now - self._request_minute[0]) + 0.05)
                if len(self._request_day) >= self.rpd:
                    sleep_for = max(sleep_for, 86_400 - (now - self._request_day[0]) + 0.05)
                if self._minute_tokens() + estimated_tokens > self.tpm and self._tokens_minute:
                    sleep_for = max(sleep_for, 60 - (now - self._tokens_minute[0][0]) + 0.05)
                if self._day_tokens() + estimated_tokens > self.tpd and self._tokens_day:
                    sleep_for = max(sleep_for, 86_400 - (now - self._tokens_day[0][0]) + 0.05)

                if sleep_for <= 0:
                    stamp = time.time()
                    self._last_request_at = stamp
                    self._request_minute.append(stamp)
                    self._request_day.append(stamp)
                    self._tokens_minute.append((stamp, estimated_tokens))
                    self._tokens_day.append((stamp, estimated_tokens))
                    return

            time.sleep(sleep_for)


def estimate_tokens(text: str, reserved_output_tokens: int) -> int:
    prompt_tokens = max(1, len(text) // 4)
    return prompt_tokens + max(1, reserved_output_tokens)


llm_rate_limiter = RateLimiter(rpm=30, rpd=1000, tpm=8000, tpd=200_000)
