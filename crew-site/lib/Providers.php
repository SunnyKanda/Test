<?php
declare(strict_types=1);

/** A failure whose message is safe and useful to show in the chat. */
final class ProviderError extends RuntimeException
{
    public function __construct(string $message, public bool $modelMissing = false)
    {
        parent::__construct($message);
    }
}

/** The four model connections: Claude, GPT, Gemini and Grok. */
final class Providers
{
    public const AGENTS = [
        'claude' => [
            'name' => 'Claude', 'role' => 'Coach', 'scout' => 'Research scout',
            'does' => 'keeps the plan honest and breaks goals into small steps',
            'default_model' => 'claude-opus-5-5', 'key_url' => 'https://console.anthropic.com',
        ],
        'gpt' => [
            'name' => 'GPT', 'role' => 'Job hunter', 'scout' => 'Job scout',
            'does' => 'CVs, cover letters, applications and interview practice',
            'base' => 'https://api.openai.com/v1', 'default_model' => 'auto', 'key_url' => 'https://platform.openai.com',
        ],
        'gemini' => [
            'name' => 'Gemini', 'role' => 'Researcher', 'scout' => 'Support scout',
            'does' => 'how things work, training options, support Sunny may be entitled to',
            'base' => 'https://generativelanguage.googleapis.com/v1beta/openai', 'default_model' => 'auto',
            'key_url' => 'https://aistudio.google.com',
        ],
        'grok' => [
            'name' => 'Grok', 'role' => 'Money ideas', 'scout' => 'Money scout',
            'does' => 'realistic ways to earn soon, and blunt reality checks',
            'base' => 'https://api.x.ai/v1', 'default_model' => 'auto', 'key_url' => 'https://console.x.ai',
        ],
    ];
    public const ORDER = ['claude', 'gpt', 'gemini', 'grok'];

    /** Claude models that accept the server-side refusal fallback. */
    private const FALLBACK_MODELS = ['claude-fable-5-2', 'claude-fable-5-1', 'claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5'];

    /** Model ids that are not for plain text chat. */
    private const NOT_CHAT = '/embed|image|imagine|imagen|audio|tts|whisper|transcri|realtime|moderation|video|veo|sora|'
        . 'dall|search|codex|code|vision|live|robotics|computer|guard|aqa|learnlm|gemma|deep-research|-pro\b/i';

    public bool $mock;
    /** Tests swap these in to answer without the network. */
    public $http = null;
    public $claudeTransport = null;

    public function __construct(private Db $db, private string $secret)
    {
        $this->mock = getenv('CREW_MOCK') === '1';
    }

    // ── keys ────────────────────────────────────────────────────────────────
    private function box(): string
    {
        return sodium_crypto_generichash($this->secret, '', SODIUM_CRYPTO_SECRETBOX_KEYBYTES);
    }

    public function key(string $agent): string
    {
        $stored = $this->db->get("key_$agent");
        if ($stored === '') {
            return '';
        }
        $raw = base64_decode($stored, true);
        if ($raw === false || strlen($raw) <= SODIUM_CRYPTO_SECRETBOX_NONCEBYTES) {
            return '';
        }
        $nonce = substr($raw, 0, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
        $plain = sodium_crypto_secretbox_open(substr($raw, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES), $nonce, $this->box());
        return $plain === false ? '' : $plain;
    }

    public function setKey(string $agent, string $key): void
    {
        $key = trim($key);
        $value = '';
        if ($key !== '') {
            $nonce = random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
            $value = base64_encode($nonce . sodium_crypto_secretbox($key, $nonce, $this->box()));
        }
        $this->db->set("key_$agent", $value);
        $this->db->set("auto_model_$agent", '');
    }

    public function enabled(string $agent): bool
    {
        return $this->db->get("enabled_$agent", '1') === '1';
    }

    public function ready(string $agent): bool
    {
        return $this->enabled($agent) && ($this->mock || $this->key($agent) !== '');
    }

    public function readyAgents(): array
    {
        return array_values(array_filter(self::ORDER, fn ($a) => $this->ready($a)));
    }

    // ── plumbing ────────────────────────────────────────────────────────────
    /** One JSON request. Returns [status, decoded body]. */
    private function http(string $method, string $url, array $headers, ?array $body, int $timeout): array
    {
        if ($this->http) {
            return ($this->http)($method, $url, $headers, $body);
        }
        $ch = curl_init($url);
        $send = ['Content-Type: application/json'];
        foreach ($headers as $k => $v) {
            $send[] = "$k: $v";
        }
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => $method, CURLOPT_HTTPHEADER => $send, CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $timeout, CURLOPT_CONNECTTIMEOUT => 15,
        ]);
        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        }
        $raw = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $errno = curl_errno($ch);
        curl_close($ch);
        if ($raw === false) {
            return [$errno === CURLE_OPERATION_TIMEDOUT ? -1 : 0, []];
        }
        return [$status, json_decode($raw, true) ?: []];
    }

    private function fail(string $agent, int $status, array $body, string $model = ''): ProviderError
    {
        $name = self::AGENTS[$agent]['name'];
        $site = preg_replace('#^https://#', '', self::AGENTS[$agent]['key_url']);
        $detail = $body['error']['message'] ?? ($body[0]['error']['message'] ?? '');
        $detail = is_string($detail) ? mb_substr($detail, 0, 200) : '';
        return match (true) {
            $status === -1 => new ProviderError("$name took too long to answer."),
            $status === 0 => new ProviderError("Couldn't reach $name from the server."),
            $status === 401 => new ProviderError("$name's API key was rejected. Check it in Settings."),
            $status === 403 => new ProviderError("$name's key isn't allowed to do this. Check the account at $site." . ($detail ? " ($detail)" : '')),
            $status === 404 => new ProviderError("$name doesn't have a model called “{$model}”. Pick another in Settings.", true),
            $status === 429 => new ProviderError("$name is out of credit or over its rate limit. Check billing at $site, or try again shortly."),
            $status >= 500 => new ProviderError("$name's service is having trouble ($status). Try again shortly."),
            default => new ProviderError("$name refused the request ($status): $detail", $status === 400 && stripos($detail, 'model') !== false),
        };
    }

    private function claude(int $timeout = 150): \Anthropic\Client
    {
        if (!class_exists(\Anthropic\Client::class)) {
            throw new ProviderError('Claude needs the “vendor” folder, which is missing from this install. Upload the full Crew zip again.');
        }
        $options = ['timeout' => (float) $timeout, 'maxRetries' => 1];
        if ($this->claudeTransport) {
            $options['transporter'] = $this->claudeTransport;
        }
        return new \Anthropic\Client(apiKey: $this->key('claude') ?: 'missing', requestOptions: $options);
    }

    private function claudeFail(Throwable $e, string $model): ProviderError
    {
        if ($e instanceof ProviderError) {
            return $e;
        }
        if ($e instanceof \Anthropic\Core\Exceptions\APITimeoutException) {
            return $this->fail('claude', -1, []);
        }
        if ($e instanceof \Anthropic\Core\Exceptions\APIConnectionException) {
            return $this->fail('claude', 0, []);
        }
        if ($e instanceof \Anthropic\Core\Exceptions\APIStatusException) {
            return $this->fail('claude', (int) $e->status, ['error' => ['message' => $e->getMessage()]], $model);
        }
        return new ProviderError('Claude failed: ' . mb_substr($e->getMessage(), 0, 200));
    }

    // ── models ──────────────────────────────────────────────────────────────
    /** Text-chat model ids the key can use, best guess first. */
    public function listModels(string $agent): array
    {
        if ($this->mock) {
            return ["mock-$agent-large", "mock-$agent-small"];
        }
        $found = [];
        if ($agent === 'claude') {
            try {
                foreach ($this->claude(30)->models->list(limit: 100)->pagingEachItem() as $m) {
                    $found[] = [$m->id, 0];
                }
            } catch (Throwable $e) {
                throw $this->claudeFail($e, '');
            }
        } else {
            [$status, $body] = $this->http('GET', self::AGENTS[$agent]['base'] . '/models',
                ['Authorization' => 'Bearer ' . $this->key($agent)], null, 30);
            if ($status !== 200) {
                throw $this->fail($agent, $status, $body);
            }
            foreach ($body['data'] ?? [] as $m) {
                $found[] = [preg_replace('#^models/#', '', (string) ($m['id'] ?? '')), (int) ($m['created'] ?? 0)];
            }
        }
        return self::rank($agent, $found);
    }

    public static function rank(string $agent, array $found): array
    {
        $chat = array_values(array_filter($found, fn ($m) => str_starts_with($m[0], $agent) && !preg_match(self::NOT_CHAT, $m[0])));
        $nums = fn (string $id) => array_map('intval', array_slice(preg_split('/\D+/', $id, -1, PREG_SPLIT_NO_EMPTY), 0, 2)) + [0, 0];
        usort($chat, function ($a, $b) use ($agent, $nums) {
            if ($agent === 'claude') {
                $ka = [$a[0] !== 'claude-opus-5-5', $a[0]];
                $kb = [$b[0] !== 'claude-opus-5-5', $b[0]];
            } elseif ($agent === 'gemini') {
                // The free tier covers Flash models, so those lead.
                $key = fn ($id) => [$id !== 'gemini-flash-latest', !str_contains($id, 'flash'), str_contains($id, 'lite'),
                    (bool) preg_match('/preview|exp/', $id), -$nums($id)[0], -$nums($id)[1]];
                [$ka, $kb] = [$key($a[0]), $key($b[0])];
            } else {
                // GPT and Grok: newest first, with dated snapshots behind plain names.
                $dated = fn ($id) => (bool) preg_match('/\d{4}-?\d{2}-?\d{2}|\d{4}$/', $id);
                $ka = [$dated($a[0]), -$a[1], $a[0]];
                $kb = [$dated($b[0]), -$b[1], $b[0]];
            }
            return $ka <=> $kb;
        });
        return array_column($chat, 0);
    }

    public function model(string $agent): string
    {
        $chosen = $this->db->get("model_$agent") ?: self::AGENTS[$agent]['default_model'];
        if ($chosen !== 'auto') {
            return $chosen;
        }
        $cached = $this->db->get("auto_model_$agent");
        if ($cached !== '') {
            return $cached;
        }
        $ranked = $this->listModels($agent);
        if (!$ranked) {
            throw new ProviderError(self::AGENTS[$agent]['name'] . "'s key works but no chat model was found. Pick one in Settings.");
        }
        $this->db->set("auto_model_$agent", $ranked[0]);
        return $ranked[0];
    }

    private function guard(string $agent): string
    {
        if ($this->key($agent) === '') {
            throw new ProviderError(self::AGENTS[$agent]['name'] . ' has no API key yet. Add one in Settings.');
        }
        return $this->model($agent);
    }

    private function forget(string $agent, ProviderError $e): ProviderError
    {
        if ($e->modelMissing) {
            $this->db->set("auto_model_$agent", '');
        }
        return $e;
    }

    // ── chat ────────────────────────────────────────────────────────────────
    /** One chat reply. $messages is a list of ['role' => user|assistant, 'content' => text]. */
    public function complete(string $agent, string $system, array $messages): string
    {
        if ($this->mock) {
            return self::mockReply($agent, $messages);
        }
        $model = $this->guard($agent);
        if ($agent === 'claude') {
            try {
                $client = $this->claude();
                if (in_array($model, self::FALLBACK_MODELS, true)) {
                    // If the model declines a request, the API retries it on a fallback model.
                    $message = $client->beta->messages->create(
                        model: $model, maxTokens: 16000, system: $system, messages: $messages,
                        outputConfig: ['effort' => 'medium'],
                        betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
                    );
                } else {
                    $message = $client->messages->create(model: $model, maxTokens: 16000, system: $system, messages: $messages);
                }
                if ($message->stopReason === 'refusal') {
                    throw new ProviderError('Claude declined to answer that one.');
                }
                $text = '';
                foreach ($message->content as $block) {
                    if ($block->type === 'text') {
                        $text .= $block->text;
                    }
                }
            } catch (Throwable $e) {
                throw $this->forget($agent, $this->claudeFail($e, $model));
            }
        } else {
            // No token limit is sent: the three services disagree on the parameter name,
            // and reply length is steered by the prompt instead.
            [$status, $body] = $this->http('POST', self::AGENTS[$agent]['base'] . '/chat/completions',
                ['Authorization' => 'Bearer ' . $this->key($agent)],
                ['model' => $model, 'messages' => [['role' => 'system', 'content' => $system], ...$messages]], 110);
            if ($status !== 200) {
                throw $this->forget($agent, $this->fail($agent, $status, $body, $model));
            }
            $text = (string) ($body['choices'][0]['message']['content'] ?? '');
        }
        if (trim($text) === '') {
            throw new ProviderError(self::AGENTS[$agent]['name'] . ' sent back an empty reply.');
        }
        return trim($text);
    }

    // ── browsing the web ────────────────────────────────────────────────────
    /** A research run with live web search. Returns ['text' => report, 'sources' => [[url, title], …]]. */
    public function research(string $agent, string $system, string $brief): array
    {
        if ($this->mock) {
            return self::mockResearch($agent, $brief);
        }
        $model = $this->guard($agent);
        $text = '';
        $sources = [];
        $add = function (?string $url, ?string $title) use (&$sources) {
            if ($url && preg_match('#^https?://#', $url) && !isset($sources[$url]) && count($sources) < 40) {
                $sources[$url] = ['url' => $url, 'title' => mb_substr(trim((string) $title) ?: $url, 0, 160)];
            }
        };
        if ($agent === 'claude') {
            try {
                $message = $this->claude(170)->messages->create(
                    model: $model, maxTokens: 16000, system: $system,
                    messages: [['role' => 'user', 'content' => $brief]],
                    tools: [['type' => 'web_search_20260209', 'name' => 'web_search', 'maxUses' => 6]],
                );
                if ($message->stopReason === 'refusal') {
                    throw new ProviderError('Claude declined to run that search.');
                }
                foreach (json_decode(json_encode($message), true)['content'] ?? [] as $block) {
                    if (($block['type'] ?? '') === 'text') {
                        $text .= $block['text'];
                        foreach ($block['citations'] ?? [] as $c) {
                            $add($c['url'] ?? null, $c['title'] ?? null);
                        }
                    } elseif (($block['type'] ?? '') === 'web_search_tool_result' && array_is_list($block['content'] ?? null)) {
                        foreach ($block['content'] as $hit) {
                            $add($hit['url'] ?? null, $hit['title'] ?? null);
                        }
                    }
                }
            } catch (Throwable $e) {
                throw $this->forget($agent, $this->claudeFail($e, $model));
            }
        } elseif ($agent === 'gemini') {
            [$status, $body] = $this->http('POST',
                'https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode($model) . ':generateContent',
                ['x-goog-api-key' => $this->key($agent)],
                ['systemInstruction' => ['parts' => [['text' => $system]]],
                 'contents' => [['role' => 'user', 'parts' => [['text' => $brief]]]],
                 'tools' => [['google_search' => new stdClass()]]], 170);
            if ($status !== 200) {
                throw $this->forget($agent, $this->fail($agent, $status, $body, $model));
            }
            $candidate = $body['candidates'][0] ?? [];
            foreach ($candidate['content']['parts'] ?? [] as $part) {
                $text .= $part['text'] ?? '';
            }
            foreach ($candidate['groundingMetadata']['groundingChunks'] ?? [] as $chunk) {
                $add($chunk['web']['uri'] ?? null, $chunk['web']['title'] ?? null);
            }
        } else {
            // GPT and Grok share the Responses format and its web_search tool.
            [$status, $body] = $this->http('POST', self::AGENTS[$agent]['base'] . '/responses',
                ['Authorization' => 'Bearer ' . $this->key($agent)],
                ['model' => $model, 'instructions' => $system, 'input' => $brief, 'tools' => [['type' => 'web_search']]], 170);
            if ($status !== 200) {
                throw $this->forget($agent, $this->fail($agent, $status, $body, $model));
            }
            foreach ($body['output'] ?? [] as $item) {
                if (($item['type'] ?? '') !== 'message') {
                    continue;
                }
                foreach ($item['content'] ?? [] as $part) {
                    if (($part['type'] ?? '') === 'output_text') {
                        $text .= $part['text'] ?? '';
                        foreach ($part['annotations'] ?? [] as $note) {
                            $add($note['url'] ?? null, $note['title'] ?? null);
                        }
                    }
                }
            }
        }
        if (trim($text) === '') {
            throw new ProviderError(self::AGENTS[$agent]['name'] . ' came back from the web with nothing.');
        }
        return ['text' => trim($text), 'sources' => array_values($sources)];
    }

    // ── fake replies for tests and demos ────────────────────────────────────
    private static function mockReply(string $agent, array $messages): string
    {
        $last = $messages ? (string) end($messages)['content'] : '';
        $name = self::AGENTS[$agent]['name'];
        if (getenv('CREW_MOCK_FAIL') === $agent) {
            throw new ProviderError("$name's API key was rejected. Check it in Settings.");
        }
        if (str_contains($last, '[Check-in]')) {
            return "Morning Sunny. One thing first: open your CV file.\n[[task: Open CV and fix the top section | today]]";
        }
        if (stripos($last, 'find me') !== false) {
            return "I'll send a scout to look and report back here.\n[[scout: Find current warehouse job adverts near Sunny]]";
        }
        if (stripos($last, 'write my cv') !== false) {
            return "Here's a first draft. It's saved in your papers.\n[[paper: CV draft]]\nSunny\nWarehouse operative, 3 years\n[[/paper]]";
        }
        if ($agent === 'gemini') {
            return 'PASS';
        }
        if ($agent === 'gpt') {
            return "GPT: Agreed. Send me your last job title and I'll draft the CV summary.\n[[remember: Wants a job quickly]]";
        }
        return "Here's a small step for today, from $name.\n[[task: Write down three jobs you could do tomorrow | today]]";
    }

    private static function mockResearch(string $agent, string $brief): array
    {
        if (getenv('CREW_MOCK_FAIL') === $agent) {
            throw new ProviderError(self::AGENTS[$agent]['name'] . ' is out of credit or over its rate limit.');
        }
        return [
            'text' => "Found two adverts worth a look and one site to check weekly.\n---\n"
                . "Two current adverts matched. Both list an hourly rate and say no experience is needed.\n\n"
                . "[[job: Warehouse operative | Acme Logistics | https://example.com/jobs/123]]\n"
                . "[[job: Night picker | Made-up Ltd | https://not-in-sources.example/9]]\n"
                . "[[task: Apply for the Acme warehouse job | tomorrow]]",
            'sources' => [['url' => 'https://example.com/jobs/123', 'title' => 'Warehouse operative at Acme Logistics'],
                          ['url' => 'https://example.com/board', 'title' => 'Local jobs board']],
        ];
    }
}
