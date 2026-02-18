import { motion } from "framer-motion";
import { Bot, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const Assistant = () => {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Assistants
              </h2>
              <p className="text-sm text-muted-foreground">
                Manage your AI assistants
              </p>
            </div>
          </div>
          <Button className="neon-glow">
            <Plus className="h-4 w-4 mr-2" />
            New Assistant
          </Button>
        </div>

        <div className="glass rounded-lg p-12 text-center">
          <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <h3 className="text-foreground font-medium mb-2">
            No assistants yet
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Create your first AI assistant to get started with automated
            workflows and intelligent responses.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Assistant;
