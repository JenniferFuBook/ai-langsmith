import React from 'react';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import {
  initializeAgentExecutorWithOptions,
  AgentExecutor,
} from 'langchain/agents';
import { SerpAPI } from 'langchain/tools';
import { Calculator } from 'langchain/tools/calculator';
import { Client } from 'langsmith';
import { LangChainTracer } from 'langchain/callbacks';

const ActionProvider = ({ createChatBotMessage, setState, children }: any) => {
  const executor = React.useRef<AgentExecutor>();
  const tracer = React.useRef<LangChainTracer>();

  React.useEffect(() => {
    const init = async () => {
      // create a LangSmith client with endpoint and key
      const client = new Client({
        apiUrl: 'https://api.smith.langchain.com',
        apiKey: import.meta.env.VITE_LANGCHAIN_API_KEY,
      });

      // create a LangChainTracer to trace the call
      tracer.current = new LangChainTracer({
        projectName: import.meta.env.VITE_LANGCHAIN_PROJECT,
        client,
      });

      // define a model
      const model = new ChatOpenAI({
        // use OPENAI_API_KEY
        openAIApiKey: import.meta.env.VITE_OPENAI_API_KEY,
        // use GPT 4
        modelName: 'gpt-4',
        // temperature is a number between 0 and 2, with a default value of
        // 1 or 0.7 depending on the selected model. The temperature is used
        // to control the randomness of the output. When it is set higher,
        // there will be more random outputs.
        temperature: 0,
      });

      // define two tools
      const tools = [
        new Calculator(),
        new SerpAPI(import.meta.env.VITE_SERPAPI_API_KEY),
      ];

      // initialize the agent with two tools
      executor.current = await initializeAgentExecutorWithOptions(
        tools,
        model,
        {
          agentType: 'openai-functions',
          // show verbose information in browser console
          verbose: true,
        }
      );
    };

    init();
  }, []);

  const generateResponse = async (message: string) => {
    if (executor.current) {
      // agent takes a list of messages as input and returns a message
      // the tracer is attached
      const response = await executor.current.call(
        { input: message },
        { callbacks: [tracer.current] }
      );
      // the message is converted to a string message
      const botMessage = createChatBotMessage(response.output);

      setState((prev: any) => ({
        ...prev,
        // combine the previous and new messages
        messages: [...prev.messages, botMessage],
      }));
    }
  };

  return (
    <div>
      {React.Children.map(children, (child) => {
        return React.cloneElement(child, {
          actions: {
            // define the action
            generateResponse,
          },
        });
      })}
    </div>
  );
};

export default ActionProvider;
