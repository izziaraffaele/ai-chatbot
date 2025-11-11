'use client';
import React from 'react';
import {
  DemoConfigPanel,
  DemoConfigPanelContent,
  DemoConfigPanelTrigger,
} from './panel';
import { useFormContext } from 'react-hook-form';
import { DemoConfigFieldGroup, DemoConfigForm } from './form';
import { DemoConfig as DemoConfigType } from '@/config/demo.schema';
import { FormInput } from '@/components/ui/form-input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DemoThemePicker } from './theme-picker';
import { SuggestionListControl } from './suggestion-list';
import { SwitchListControl } from './switch-list';
import { ExperienceConfig, ExperiencesListControl } from './experiences-list';
import { IntentsListControl } from './intents-list';
import {
  User,
  MessageSquare,
  Palette,
  Image as ImageIcon,
  Lightbulb,
  Sparkles,
  Building2,
  AppWindow,
  Database,
  Target,
  Layers,
} from 'lucide-react';

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
        <div className="leading-none font-semibold">{title}</div>
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
      title="Profile"
      description="Define your assistant's identity and personality"
      icon={User}
    >
      <FormInput
        name="assistant.avatar"
        label="Avatar"
        control={form.control}
      />
      <FormInput name="assistant.name" label="Name" control={form.control} />
      <FormInput
        name="assistant.description"
        label="Description"
        control={form.control}
        asChild
      >
        <Textarea rows={3} />
      </FormInput>
      <FormInput
        name="assistant.tone"
        control={form.control}
        label="Tone"
        render={({ field }) => (
          <Select
            value={String(field.value)}
            onValueChange={(v) => {
              field.onChange({ target: { value: v } } as any);
              field.onBlur();
            }}
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
      title="Behavior"
      description="Set instructions and guidelines for responses"
      icon={MessageSquare}
    >
      <FormInput
        name="assistant.instructions"
        label="Instructions"
        control={form.control}
        asChild
      >
        <Textarea rows={3} />
      </FormInput>

      <FormInput
        name="assistant.guidelines"
        label="Guidelines"
        control={form.control}
        asChild
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
      title="Theme"
      description="Customize colors, presets, and display mode"
      icon={Palette}
    >
      <FormInput
        name="appearance.preset"
        label="Preset"
        control={form.control}
        render={({ field }) => (
          <Select
            value={String(field.value)}
            onValueChange={(v) => {
              field.onChange({ target: { value: v } } as any);
              field.onBlur();
            }}
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
        name="appearance.customCss"
        label="Custom theme"
        control={form.control}
        asChild
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
        name="appearance.defaultMode"
        label="Default mode"
        control={form.control}
        render={({ field }) => (
          <Select
            value={String(field.value)}
            onValueChange={(v) => {
              field.onChange({ target: { value: v } } as any);
              field.onBlur();
            }}
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
      title="Assets"
      description="Upload your logo and favicon"
      icon={ImageIcon}
    >
      <FormInput
        name="appearance.favicon"
        label="Favicon URL"
        type="url"
        control={form.control}
      />
      <FormInput
        name="appearance.logo"
        label="Logo URL"
        type="url"
        control={form.control}
      />
    </DemoConfigFieldGroup>
  );
};

const ChatSuggestionsFieldset = () => {
  const form = useFormContext<DemoConfigType>();
  return (
    <DemoConfigFieldGroup
      title="Suggestions"
      description="Add quick-start prompts for users"
      icon={Lightbulb}
    >
      <FormInput
        name="chat.suggestions"
        label="Suggestions"
        control={form.control}
        render={({ field }) => (
          <SuggestionListControl
            value={(Array.isArray(field.value) ? field.value : []) as string[]}
            onValueChange={(v) => {
              field.onChange({ target: { value: v } } as any);
              field.onBlur();
            }}
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
      title="Features"
      description="Enable or disable chat capabilities"
      icon={Sparkles}
    >
      <FormInput
        name="chat.features"
        label="Active Features"
        control={form.control}
        render={({ field }) => (
          <SwitchListControl
            value={field.value as Record<string, boolean>}
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
            onValueChange={(v) => {
              field.onChange({ target: { value: v } } as any);
              field.onBlur();
            }}
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
      title="Organization"
      description="Provide details about your company"
      icon={Building2}
    >
      <FormInput
        name="context.organization.name"
        label="Name"
        control={form.control}
      />
      <FormInput
        name="context.organization.description"
        label="Description"
        control={form.control}
        asChild
      >
        <Textarea rows={3} />
      </FormInput>
      <FormInput
        name="context.organization.websiteUrl"
        label="Website URL"
        type="url"
        control={form.control}
      />
    </DemoConfigFieldGroup>
  );
};

const ContextAppFieldset = () => {
  const form = useFormContext<DemoConfigType>();
  return (
    <DemoConfigFieldGroup
      title="App"
      description="Define your application context"
      icon={AppWindow}
    >
      <FormInput name="context.app.name" label="Name" control={form.control} />
      <FormInput
        name="context.app.description"
        label="Description"
        control={form.control}
        asChild
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
      title="Indexes"
      description="Connect knowledge bases and data sources"
      icon={Database}
    >
      <FormInput
        name="context.indexes"
        label="Connected Indexes"
        control={form.control}
        render={({ field }) => {
          const currentValue = (field.value || []) as string[];
          return (
            <SwitchListControl
              value={currentValue.reduce(
                (carry, v) => ({
                  ...carry,
                  [v]: true,
                }),
                {} as Record<string, boolean>
              )}
              options={[
                { label: 'MemorAIz', value: 'memoraiz', disabled: true },
                { label: 'Demo Courses', value: 'demo-courses' },
              ]}
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
      title="Intents"
      description="Define user goals and trigger actions"
      icon={Target}
    >
      <FormInput
        name="runtime.intents"
        control={form.control}
        render={({ field }) => {
          const currentValue = (field.value as ExperienceConfig[]) || [];

          return (
            <IntentsListControl
              value={field.value as any}
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
      title="Experiences"
      description="Create custom interaction flows"
      icon={Layers}
    >
      <FormInput
        name="runtime.experiences"
        control={form.control}
        render={({ field }) => {
          const currentValue = (field.value as ExperienceConfig[]) || [];

          return (
            <ExperiencesListControl
              value={field.value as any}
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
            title="Assistant"
            description="Configure your AI assistant's identity and behavior"
          >
            <AssistantProfileFieldset />
            <AssistantBehaviourFieldset />
          </DemoConfigSection>
          <DemoConfigSection
            title="Appearance"
            description="Customize visual design and branding"
          >
            <AppearanceThemeFieldset />
            <AppearanceAssetsFieldset />
          </DemoConfigSection>
          <DemoConfigSection
            title="Chat"
            description="Manage conversation features and user experience"
          >
            <ChatSuggestionsFieldset />
            <ChatFeaturesFieldset />
          </DemoConfigSection>
          <DemoConfigSection
            title="Context"
            description="Provide background information for better responses"
          >
            <ContextOrganizationFieldset />
            <ContextAppFieldset />
            <ContextIndexesFieldset />
          </DemoConfigSection>
          <DemoConfigSection
            title="Runtime"
            description="Build dynamic experiences and intelligent routing"
          >
            <RuntimeIntentsFieldset />
            <RuntimeExperiencesFieldset />
          </DemoConfigSection>
        </div>
      </DemoConfigForm>
    </DemoConfigPanelContent>
  </DemoConfigPanel>
);
