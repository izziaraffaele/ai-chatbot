'use client';
import {
  AppWindow,
  Building2,
  Database,
  Image as ImageIcon,
  Layers,
  Lightbulb,
  MessageSquare,
  Palette,
  Sparkles,
  Target,
  User,
} from 'lucide-react';
import type React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormInput } from '@/components/ui/form-input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { DemoConfig as DemoConfigType } from '@/config/demo.schema';
import {
  type ExperienceConfig,
  ExperiencesListControl,
} from './experiences-list';
import { DemoConfigFieldGroup, DemoConfigForm } from './form';
import { ImageUpload } from './image-upload';
import { IntentsListControl } from './intents-list';
import {
  DemoConfigPanel,
  DemoConfigPanelContent,
  DemoConfigPanelTrigger,
} from './panel';
import { SuggestionListControl } from './suggestion-list';
import { SwitchListControl } from './switch-list';
import { DemoThemePicker } from './theme-picker';
import { Button } from '../ui/button';

const THEME_PRESETS = [
  {
    id: 'playful',
    name: 'Playful',
    description: 'Vibrant, friendly theme',
    previewColors: {
      primary: 'hsl(346 77% 50%)',
      secondary: 'hsl(340 82% 52%)',
      background: 'hsl(0 0% 100%)',
      foreground: 'hsl(340 82% 52%)',
    },
    css: `:root {
  --background: 0 0% 100%;
  --foreground: 340 82% 52%;
  --card: 0 0% 100%;
  --card-foreground: 340 82% 52%;
  --popover: 0 0% 100%;
  --popover-foreground: 340 82% 52%;
  --primary: 346 77% 50%;
  --primary-foreground: 0 0% 100%;
  --secondary: 340 82% 52%;
  --secondary-foreground: 0 0% 100%;
  --muted: 210 40% 96%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 340 82% 52%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 100%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 346 77% 50%;
  --radius: 0.75rem;
}

.dark {
  --background: 340 50% 5%;
  --foreground: 340 20% 95%;
  --card: 340 50% 8%;
  --card-foreground: 340 20% 95%;
  --popover: 340 50% 8%;
  --popover-foreground: 340 20% 95%;
  --primary: 346 77% 60%;
  --primary-foreground: 0 0% 100%;
  --secondary: 340 82% 30%;
  --secondary-foreground: 340 20% 95%;
  --muted: 340 50% 15%;
  --muted-foreground: 340 15% 65%;
  --accent: 346 77% 50%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 340 20% 95%;
  --border: 340 50% 20%;
  --input: 340 50% 20%;
  --ring: 346 77% 60%;
}`,
  },
  {
    id: 'tech',
    name: 'Tech',
    description: 'Dark, professional theme',
    previewColors: {
      primary: 'hsl(217 91% 60%)',
      secondary: 'hsl(217 33% 17%)',
      background: 'hsl(222 84% 5%)',
      foreground: 'hsl(210 40% 98%)',
    },
    css: `:root {
  --background: 222 84% 5%;
  --foreground: 210 40% 98%;
  --card: 222 84% 7%;
  --card-foreground: 210 40% 98%;
  --popover: 222 84% 7%;
  --popover-foreground: 210 40% 98%;
  --primary: 217 91% 60%;
  --primary-foreground: 222 84% 5%;
  --secondary: 217 33% 17%;
  --secondary-foreground: 210 40% 98%;
  --muted: 215 28% 17%;
  --muted-foreground: 217 10% 64%;
  --accent: 217 33% 17%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 63% 31%;
  --destructive-foreground: 210 40% 98%;
  --border: 215 28% 17%;
  --input: 215 28% 17%;
  --ring: 217 91% 60%;
  --radius: 0.5rem;
}

.dark {
  --background: 222 84% 5%;
  --foreground: 210 40% 98%;
  --card: 222 84% 7%;
  --card-foreground: 210 40% 98%;
  --popover: 222 84% 7%;
  --popover-foreground: 210 40% 98%;
  --primary: 217 91% 60%;
  --primary-foreground: 222 84% 5%;
  --secondary: 217 33% 17%;
  --secondary-foreground: 210 40% 98%;
  --muted: 215 28% 17%;
  --muted-foreground: 217 10% 64%;
  --accent: 217 33% 17%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 63% 31%;
  --destructive-foreground: 210 40% 98%;
  --border: 215 28% 17%;
  --input: 215 28% 17%;
  --ring: 217 91% 60%;
}`,
  },
];

const DemoConfigSection = (
  props: React.ComponentProps<'section'> & {
    title: string;
    description?: string;
  }
) => {
  const { title, description, children, ...others } = props;
  return (
    <section className="space-y-4" {...others}>
      <div className="grid flex-1 gap-1">
        <div className="font-semibold leading-none">{title}</div>
        {description && (
          <div className="text-muted-foreground text-sm">{description}</div>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
};

const AssistantProfileFieldset = () => {
  const form = useFormContext<DemoConfigType>();
  return (
    <DemoConfigFieldGroup
      description="Define your assistant's identity and personality"
      icon={User}
      title="Profile"
    >
      <FormInput
        control={form.control}
        helperText="Upload an image or provide a URL for the assistant's avatar"
        label="Avatar"
        name="assistant.avatar"
        render={({ field }) => (
          <ImageUpload
            onBlur={field.onBlur}
            onChange={(v) => {
              field.onChange({ target: { value: v } } as any);
            }}
            value={field.value as string}
          />
        )}
      />
      <FormInput control={form.control} label="Name" name="assistant.name" />
      <FormInput
        asChild
        control={form.control}
        label="Description"
        name="assistant.description"
      >
        <Textarea rows={3} />
      </FormInput>
      <FormInput
        control={form.control}
        label="Tone"
        name="assistant.tone"
        render={({ field }) => (
          <Select
            onValueChange={(v) => {
              field.onChange({ target: { value: v } } as any);
              field.onBlur();
            }}
            value={String(field.value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select the tone" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="supportive">Supportive</SelectItem>
                <SelectItem value="excited">Excited</SelectItem>
                <SelectItem value="informative">Informative</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
      />
    </DemoConfigFieldGroup>
  );
};
const AssistantBehaviourFieldset = () => {
  const form = useFormContext<DemoConfigType>();
  return (
    <DemoConfigFieldGroup
      description="Set instructions and guidelines for responses"
      icon={MessageSquare}
      title="Behavior"
    >
      <FormInput
        asChild
        control={form.control}
        label="Instructions"
        name="assistant.instructions"
      >
        <Textarea rows={3} />
      </FormInput>

      <FormInput
        asChild
        control={form.control}
        label="Guidelines"
        name="assistant.guidelines"
      >
        <Textarea rows={3} />
      </FormInput>
    </DemoConfigFieldGroup>
  );
};

const AppearanceThemeFieldset = () => {
  const form = useFormContext<DemoConfigType>();
  return (
    <DemoConfigFieldGroup
      description="Customize colors, presets, and display mode"
      icon={Palette}
      title="Theme"
    >
      <FormInput
        control={form.control}
        label="Preset"
        name="appearance.preset"
        render={({ field }) => (
          <Select
            onValueChange={(v) => {
              field.onChange({ target: { value: v } } as any);
              field.onBlur();
            }}
            value={String(field.value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select the preset" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="playful">Playful</SelectItem>
                <SelectItem value="tech">Tech</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
      />

      <FormInput
        asChild
        control={form.control}
        label="Custom theme"
        name="appearance.customCss"
      >
        <DemoThemePicker
          options={THEME_PRESETS.map((v) => ({
            label: v.name,
            primaryColor: v.previewColors.primary,
            value: v.css,
          }))}
        />
      </FormInput>

      <FormInput
        control={form.control}
        label="Default mode"
        name="appearance.defaultMode"
        render={({ field }) => (
          <Select
            onValueChange={(v) => {
              field.onChange({ target: { value: v } } as any);
              field.onBlur();
            }}
            value={String(field.value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select the default mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
      />
    </DemoConfigFieldGroup>
  );
};

const AppearanceAssetsFieldset = () => {
  const form = useFormContext<DemoConfigType>();
  return (
    <DemoConfigFieldGroup
      description="Upload your logo and favicon"
      icon={ImageIcon}
      title="Assets"
    >
      <FormInput
        control={form.control}
        helperText="Upload a small icon (max 1MB) for browser tabs and bookmarks"
        label="Favicon"
        name="appearance.favicon"
        render={({ field }) => (
          <ImageUpload
            maxSizeMB={1}
            onBlur={field.onBlur}
            onChange={(v) => {
              field.onChange({ target: { value: v } } as any);
            }}
            value={field.value as string}
          />
        )}
      />
      <FormInput
        control={form.control}
        helperText="Upload your brand logo to display in the application header"
        label="Logo"
        name="appearance.logo"
        render={({ field }) => (
          <ImageUpload
            onBlur={field.onBlur}
            onChange={(v) => {
              field.onChange({ target: { value: v } } as any);
            }}
            value={field.value as string}
          />
        )}
      />
    </DemoConfigFieldGroup>
  );
};

const ChatSuggestionsFieldset = () => {
  const form = useFormContext<DemoConfigType>();
  return (
    <DemoConfigFieldGroup
      description="Add quick-start prompts for users"
      icon={Lightbulb}
      title="Suggestions"
    >
      <FormInput
        control={form.control}
        label="Suggestions"
        name="chat.suggestions"
        render={({ field }) => (
          <SuggestionListControl
            onValueChange={(v) => {
              field.onChange({ target: { value: v } } as any);
              field.onBlur();
            }}
            value={(Array.isArray(field.value) ? field.value : []) as string[]}
          />
        )}
      />
    </DemoConfigFieldGroup>
  );
};

const ChatFeaturesFieldset = () => {
  const form = useFormContext<DemoConfigType>();
  return (
    <DemoConfigFieldGroup
      description="Enable or disable chat capabilities"
      icon={Sparkles}
      title="Features"
    >
      <FormInput
        control={form.control}
        label="Active Features"
        name="chat.features"
        render={({ field }) => (
          <SwitchListControl
            onValueChange={(v) => {
              field.onChange({ target: { value: v } } as any);
              field.onBlur();
            }}
            options={[
              { label: 'Memory', value: 'memory', disabled: true },
              { label: 'Artifacts', value: 'artifacts', disabled: true },
              {
                label: 'Multimodal Input',
                value: 'multimodalInput',
                disabled: true,
              },
              { label: 'Web Search', value: 'webSearch' },
            ]}
            value={field.value as Record<string, boolean>}
          />
        )}
      />
    </DemoConfigFieldGroup>
  );
};

const ContextOrganizationFieldset = () => {
  const form = useFormContext<DemoConfigType>();
  return (
    <DemoConfigFieldGroup
      description="Provide details about your company"
      icon={Building2}
      title="Organization"
    >
      <FormInput
        control={form.control}
        label="Name"
        name="context.organization.name"
      />
      <FormInput
        asChild
        control={form.control}
        label="Description"
        name="context.organization.description"
      >
        <Textarea rows={3} />
      </FormInput>
      <FormInput
        control={form.control}
        label="Website URL"
        name="context.organization.websiteUrl"
        type="url"
      />
    </DemoConfigFieldGroup>
  );
};

const ContextAppFieldset = () => {
  const form = useFormContext<DemoConfigType>();
  return (
    <DemoConfigFieldGroup
      description="Define your application context"
      icon={AppWindow}
      title="App"
    >
      <FormInput control={form.control} label="Name" name="context.app.name" />
      <FormInput
        asChild
        control={form.control}
        label="Description"
        name="context.app.description"
      >
        <Textarea rows={3} />
      </FormInput>
    </DemoConfigFieldGroup>
  );
};

const ContextIndexesFieldset = () => {
  const form = useFormContext<DemoConfigType>();
  return (
    <DemoConfigFieldGroup
      description="Connect knowledge bases and data sources"
      icon={Database}
      title="Indexes"
    >
      <FormInput
        control={form.control}
        label="Connected Indexes"
        name="context.indexes"
        render={({ field }) => {
          const currentValue = (field.value || []) as string[];
          return (
            <SwitchListControl
              onValueChange={(v) => {
                const newValue = Object.entries(v).reduce((carry, [k, v]) => {
                  if (v) {
                    carry.push(k);
                  }
                  return carry;
                }, [] as string[]);

                if (!newValue.includes('memoraiz')) {
                  newValue.push('memoraiz');
                }

                field.onChange({ target: { value: newValue } } as any);
                field.onBlur();
              }}
              options={[
                { label: 'MemorAIz', value: 'memoraiz', disabled: true },
                { label: 'Demo Courses', value: 'demo-courses' },
              ]}
              value={currentValue.reduce(
                (carry, v) => ({
                  ...carry,
                  [v]: true,
                }),
                {} as Record<string, boolean>
              )}
            />
          );
        }}
      />
    </DemoConfigFieldGroup>
  );
};
const RuntimeIntentsFieldset = () => {
  const form = useFormContext<DemoConfigType>();
  return (
    <DemoConfigFieldGroup
      description="Define user goals and trigger actions"
      icon={Target}
      title="Intents"
    >
      <FormInput
        control={form.control}
        name="runtime.intents"
        render={({ field }) => {
          const currentValue = (field.value as ExperienceConfig[]) || [];

          return (
            <IntentsListControl
              onAdd={(newIntent) => {
                field.onChange({
                  target: { value: [newIntent, ...currentValue] },
                });
                field.onBlur();
              }}
              onRemove={(index) => {
                field.onChange({
                  target: { value: currentValue.filter((_, i) => i !== index) },
                });
                field.onBlur();
              }}
              value={field.value as any}
            />
          );
        }}
      />
    </DemoConfigFieldGroup>
  );
};

const RuntimeExperiencesFieldset = () => {
  const form = useFormContext<DemoConfigType>();
  return (
    <DemoConfigFieldGroup
      description="Create custom interaction flows"
      icon={Layers}
      title="Experiences"
    >
      <FormInput
        control={form.control}
        name="runtime.experiences"
        render={({ field }) => {
          const currentValue = (field.value as ExperienceConfig[]) || [];

          return (
            <ExperiencesListControl
              onAdd={(exp) => {
                field.onChange({ target: { value: [exp, ...currentValue] } });
                field.onBlur();
              }}
              onRemove={(index) => {
                field.onChange({
                  target: { value: currentValue.filter((_, i) => i !== index) },
                });
                field.onBlur();
              }}
              value={field.value as any}
            />
          );
        }}
      />
    </DemoConfigFieldGroup>
  );
};

export const DemoConfig = () => (
  <DemoConfigPanel>
    <DemoConfigPanelTrigger />
    <DemoConfigPanelContent>
      <DemoConfigForm>
        <div className="space-y-6 p-4">
          <DemoConfigSection
            description="Configure your AI assistant's identity and behavior"
            title="Assistant"
          >
            <AssistantProfileFieldset />
            <AssistantBehaviourFieldset />
          </DemoConfigSection>
          <DemoConfigSection
            description="Customize visual design and branding"
            title="Appearance"
          >
            <AppearanceThemeFieldset />
            <AppearanceAssetsFieldset />
          </DemoConfigSection>
          <DemoConfigSection
            description="Manage conversation features and user experience"
            title="Chat"
          >
            <ChatSuggestionsFieldset />
            <ChatFeaturesFieldset />
          </DemoConfigSection>
          <DemoConfigSection
            description="Provide background information for better responses"
            title="Context"
          >
            <ContextOrganizationFieldset />
            <ContextAppFieldset />
            <ContextIndexesFieldset />
          </DemoConfigSection>
          <DemoConfigSection
            description="Build dynamic experiences and intelligent routing"
            title="Runtime"
          >
            <RuntimeIntentsFieldset />
            <RuntimeExperiencesFieldset />
          </DemoConfigSection>
        </div>
      </DemoConfigForm>
    </DemoConfigPanelContent>
  </DemoConfigPanel>
);
