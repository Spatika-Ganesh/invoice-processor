## Invoice Processor Chatbot AI Agent

An conversational interface where company admins can upload vendor invoices and uses an AI agent to automatically extract, validate, and manage invoice information.

- Type "process this invoice" with an invoice file and the AI agent will extract the information and store details in the database.
- Type "create sheet to view invoices" or "view invoices in sheet" to open a sheet display which shows key information of the extracted invoice information and allows to edit information, and also has actions to sort the data by vendor, amount and Invoice Date.


## Features

- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering and increased performance
- [AI SDK](https://sdk.vercel.ai/docs)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
  - Supports OpenAI (default), Anthropic, Cohere, and other model providers
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility

## Model Providers

This implementation ships with OpenAI `gpt-4o` and Anthropic `claude-3-5-sonnet-20240620`. through  [AI SDK](https://sdk.vercel.ai/docs)'s support with LLM providers for [OpenAI](https://openai.com), [Anthropic](https://anthropic.com).


## Running locally

Add the API keys to use the environment variables [defined in `.env.example`](.env.example) to run Next.js AI Chatbot. 

```bash
pnpm install
pnpm db:migrate
pnpm dev
```

The invoice processor app should now be running on [localhost:3000](http://localhost:3000/).
