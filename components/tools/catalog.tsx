import { SearchIcon } from "lucide-react";
import type { ChatTools } from "@/lib/types";
import { Shimmer } from "../elements/shimmer";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "../elements/tool";
import type { ChatToolProps } from "./types";

export function CatalogSearchTool(
  props: ChatToolProps<Pick<ChatTools, "catalogSearch">>
) {
  const { part } = props;

  return (
    <Tool className="mb-0" defaultOpen={false}>
      <ToolHeader
        icon={SearchIcon}
        state={part.state}
        title={
          part.state === "input-available" ? (
            <Shimmer>Ricerca catalogo</Shimmer>
          ) : (
            "Ricerca catalogo"
          )
        }
        type={part.type}
      />
      <ToolContent>
        {part.input && <ToolInput input={part.input.query} />}
        {part.state === "output-available" && Boolean(part.output) && (
          <ToolOutput errorText={undefined} output={part.output.results} />
        )}
      </ToolContent>
    </Tool>
  );
}
