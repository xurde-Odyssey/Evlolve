# Communication production notes

Communication uses server-only provider adapters. Browser code sends user text or an audio file to the authenticated Communication route; it never receives provider credentials or chooses a provider/model.

## Providers

The default development configuration is `mock`. To enable the first external adapter, set:

```env
COMMUNICATION_LLM_PROVIDER=groq
COMMUNICATION_CHAT_MODEL=llama-3.1-8b-instant
COMMUNICATION_ANALYSIS_MODEL=llama-3.1-8b-instant
SPEECH_TO_TEXT_PROVIDER=groq
GROQ_API_KEY=...
GROQ_STT_MODEL=whisper-large-v3-turbo
```

Set `COMMUNICATION_PROVIDER_FALLBACK_ENABLED=true` only when falling back to the deterministic development provider is acceptable for the deployment. Provider errors are normalized at the route boundary and do not expose vendor messages to users.

## Audio and privacy

Audio is accepted only through the authenticated transcription route, checked for type and size, sent to the configured speech provider, and not persisted by Evolve. The transcript is persisted as the session message. `COMMUNICATION_AUDIO_MAX_MB` and `COMMUNICATION_AUDIO_MAX_SECONDS` are server configuration hooks; duration validation requires inspecting the media container and is not currently available for every browser codec.

## Context and cost controls

Conversation requests retain only the most recent bounded context. Analysis requests receive the bounded session context and must return validated JSON before skill evidence is written. Provider calls are rate-limited per authenticated user in the application process. A distributed limiter should replace this process-local guard before running multiple application instances.

## Shared learning architecture

The modules use one Communication skill evidence table and scoring service. Session-specific records remain normalized by module. Phrase mastery remains the single phrase service. Session status normalization and minimum meaningful-session thresholds live in `src/application/communication/session.ts`.

The current Evolve activity ledger does not yet have a `communication` ActivityKey. Until that domain migration is introduced, Communication sessions retain their own authoritative completion record and skill evidence; no fake activity or XP transaction is generated.
