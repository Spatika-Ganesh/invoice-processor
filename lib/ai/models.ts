import { openai } from '@ai-sdk/openai';
import { fireworks } from '@ai-sdk/fireworks';
import { anthropic } from '@ai-sdk/anthropic';
import { customProvider, extractReasoningMiddleware, wrapLanguageModel } from 'ai';

export const DEFAULT_CHAT_MODEL: string = 'pdf-model';

export const myProvider = customProvider({
  languageModels: {
    'chat-model-small': openai('gpt-4o-mini'),
    'chat-model-large': openai('gpt-4o'),
    'chat-model-reasoning': wrapLanguageModel({
      model: fireworks('accounts/fireworks/models/deepseek-r1'),
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    }),
    'title-model': openai('gpt-4o-mini'),
    'block-model': openai('gpt-4o-mini'),
    'pdf-model': anthropic('claude-3-5-sonnet-20240620'),
  },
  imageModels: {
    'small-model': openai.image('dall-e-2'),
    'large-model': openai.image('dall-e-3'),
  },
});

interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'pdf-model',
    name: 'Anthropic Invoice Processor',
    description: 'Claude 3.5 Sonnet model optimized for invoice processing',
  },
  {
    id: 'chat-model-large',
    name: 'OpenAI Image-Only Invoice Processor',
    description: 'OpenAI model for image only invoice processing',
  },
];
