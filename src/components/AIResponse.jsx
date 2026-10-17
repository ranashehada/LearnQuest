
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./AIResponse.css";

export default function AIResponse({ content }) {
  return (
    <article className="ai-response">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </article>
  );
}
