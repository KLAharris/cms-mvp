import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormHelperText,
  InputBase,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import Link from '@tiptap/extension-link';
import CodeBlock from '@tiptap/extension-code-block';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Underline from '@tiptap/extension-underline';
import { useQueryClient } from '@tanstack/react-query';
import { type ReactElement, useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';

import { useContentEditor } from '../hooks/useContentEditor';
import { StatusChip } from '../components/StatusChip';
import { useAuthStore } from '../../auth/store/auth.store';
import type { ContentType } from '../types/content.types';
import { updateContent } from '../api/content.api';
import { slugify } from '../utils/slugify';
import { MediaPickerDialog } from '../../../shared/components/MediaPickerDialog';
import type { MediaItem } from '../../media/types/media.types';

interface ContentEditorPageProps {
  type: ContentType;
}

function AutosaveIndicator({
  status,
}: {
  status: { kind: string; at?: Date; error?: unknown };
}): ReactElement {
  if (status.kind === 'saving') {
    return (
      <Typography
        variant="bodyMedium"
        color="text.secondary"
        data-testid="autosave-indicator"
        sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
      >
        <CircularProgress size={12} />
        Saving...
      </Typography>
    );
  }

  if (status.kind === 'saved' && status.at instanceof Date) {
    const sec = Math.floor((Date.now() - status.at.getTime()) / 1000);
    return (
      <Typography
        variant="bodyMedium"
        color="success.main"
        data-testid="autosave-indicator"
      >
        Saved {sec} sec ago
      </Typography>
    );
  }

  if (status.kind === 'error') {
    return (
      <Typography variant="bodyMedium" color="error" data-testid="autosave-indicator">
        Couldn&apos;t save
      </Typography>
    );
  }

  return (
    <Typography
      variant="bodyMedium"
      color="text.secondary"
      data-testid="autosave-indicator"
    >
      &nbsp;
    </Typography>
  );
}

function TipTapToolbar({ editor }: { editor: Editor }): ReactElement {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 0.5,
        flexWrap: 'wrap',
        p: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        position: 'sticky',
        top: 0,
        bgcolor: 'background.paper',
        zIndex: 1,
      }}
    >
      <Button
        size="small"
        variant={editor.isActive('bold') ? 'contained' : 'outlined'}
        onClick={() => { editor.chain().focus().toggleBold().run(); }}
        aria-label="Bold"
      >
        B
      </Button>
      <Button
        size="small"
        variant={editor.isActive('italic') ? 'contained' : 'outlined'}
        onClick={() => { editor.chain().focus().toggleItalic().run(); }}
        aria-label="Italic"
        sx={{ fontStyle: 'italic' }}
      >
        I
      </Button>
      <Button
        size="small"
        variant={editor.isActive('underline') ? 'contained' : 'outlined'}
        onClick={() => { editor.chain().focus().toggleUnderline().run(); }}
        aria-label="Underline"
        sx={{ textDecoration: 'underline' }}
      >
        U
      </Button>
      <Button
        size="small"
        variant={editor.isActive('heading', { level: 2 }) ? 'contained' : 'outlined'}
        onClick={() => { editor.chain().focus().toggleHeading({ level: 2 }).run(); }}
        aria-label="H2"
      >
        H2
      </Button>
      <Button
        size="small"
        variant={editor.isActive('heading', { level: 3 }) ? 'contained' : 'outlined'}
        onClick={() => { editor.chain().focus().toggleHeading({ level: 3 }).run(); }}
        aria-label="H3"
      >
        H3
      </Button>
      <Button
        size="small"
        variant={editor.isActive('bulletList') ? 'contained' : 'outlined'}
        onClick={() => { editor.chain().focus().toggleBulletList().run(); }}
        aria-label="Bullet list"
      >
        <span className="material-symbols-rounded" style={{ fontSize: 16 }}>format_list_bulleted</span>
      </Button>
      <Button
        size="small"
        variant={editor.isActive('orderedList') ? 'contained' : 'outlined'}
        onClick={() => { editor.chain().focus().toggleOrderedList().run(); }}
        aria-label="Ordered list"
      >
        <span className="material-symbols-rounded" style={{ fontSize: 16 }}>format_list_numbered</span>
      </Button>
      <Button
        size="small"
        variant={editor.isActive('blockquote') ? 'contained' : 'outlined'}
        onClick={() => { editor.chain().focus().toggleBlockquote().run(); }}
        aria-label="Blockquote"
      >
        <span className="material-symbols-rounded" style={{ fontSize: 16 }}>format_quote</span>
      </Button>
      <Button
        size="small"
        variant={editor.isActive('codeBlock') ? 'contained' : 'outlined'}
        onClick={() => { editor.chain().focus().toggleCodeBlock().run(); }}
        aria-label="Code block"
      >
        <span className="material-symbols-rounded" style={{ fontSize: 16 }}>code</span>
      </Button>
      <Button
        size="small"
        variant="outlined"
        onClick={() => {
          const url = window.prompt('URL');
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
        aria-label="Link"
      >
        <span className="material-symbols-rounded" style={{ fontSize: 16 }}>link</span>
      </Button>
      <Button
        size="small"
        variant="outlined"
        onClick={() => { editor.chain().focus().setHorizontalRule().run(); }}
        aria-label="Horizontal rule"
      >
        HR
      </Button>
    </Box>
  );
}

export function ContentEditorPage({ type }: ContentEditorPageProps): ReactElement {
  const { id = 'new' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? 'author';

  const {
    content,
    isLoading,
    form,
    autosaveStatus,
    submitForReview,
    publish,
    unpublish,
  } = useContentEditor(id);

  const { register, watch, setValue, formState: { isDirty } } = form;
  const titleValue = watch('title');
  const slugValue = watch('slug');
  const categoryValue = watch('category');
  const metaTitle = watch('seo.metaTitle');
  const metaDescription = watch('seo.metaDescription');

  const [saveError, setSaveError] = useState<string | null>(null);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [socialImagePickerOpen, setSocialImagePickerOpen] = useState(false);
  const [featuredImagePickerOpen, setFeaturedImagePickerOpen] = useState(false);
  const [socialImage, setSocialImage] = useState<MediaItem | null>(null);
  const [featuredImage, setFeaturedImage] = useState<MediaItem | null>(null);

  useEffect(() => {
    if (content?.tags) {
      setTags(content.tags);
    }
  }, [content?.tags]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Heading.configure({ levels: [2, 3] }),
      Link.configure({ openOnClick: false }),
      CodeBlock,
      HorizontalRule,
      Underline,
    ],
    content: content?.body as Record<string, unknown> | undefined,
    onUpdate: ({ editor: ed }) => {
      setValue('body', ed.getJSON(), { shouldDirty: true });
    },
  });

  const contentBody = content?.body;

  // Update editor content when content loads
  useEffect(() => {
    if (contentBody !== undefined && contentBody !== null) {
      editor.commands.setContent(contentBody);
    }
  }, [editor, contentBody]);

  const pageTitle = type === 'article' ? 'Articles' : 'Pages';

  const handleSaveDraft = useCallback(() => {
    if (!content) return;
    updateContent(content.id, {
      title: titleValue,
      slug: slugify(slugValue),
      body: editor.getJSON(),
      seoTitle: metaTitle,
      seoDescription: metaDescription,
      tags,
      category: categoryValue || null,
    }).then(() => {
      void queryClient.invalidateQueries({ queryKey: ['content'] });
    }).catch(() => {
      setSaveError('Failed to save draft. Please try again.');
    });
  }, [content, titleValue, slugValue, editor, metaTitle, metaDescription, tags, categoryValue, queryClient]);

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (!tags.includes(newTag)) {
        const newTags = [...tags, newTag];
        setTags(newTags);
        setValue('tags', newTags, { shouldDirty: true });
      }
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    const newTags = tags.filter((t) => t !== tag);
    setTags(newTags);
    setValue('tags', newTags, { shouldDirty: true });
  };

  const status = content?.status ?? 'draft';
  const canPublish = role === 'editor' || role === 'admin';

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Breadcrumb */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <RouterLink
          to={`/${type}s`}
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <Typography variant="bodyMedium" color="text.secondary">
            {pageTitle}
          </Typography>
        </RouterLink>
        <Typography variant="bodyMedium" color="text.secondary">/</Typography>
        <Typography variant="bodyMedium">
          {id === 'new' ? `New ${type === 'article' ? 'Article' : 'Page'}` : `Editing "${titleValue}"`}
        </Typography>
      </Box>

      {/* Two-pane layout */}
      <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
        {/* Main pane */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Title input */}
          <InputBase
            {...register('title')}
            placeholder="Title"
            fullWidth
            sx={{
              fontSize: '2rem',
              fontWeight: 400,
              lineHeight: 1.25,
              mb: 1,
              '& input': {
                padding: 0,
              },
            }}
            inputProps={{ 'aria-label': 'title' }}
          />

          {/* Slug field */}
          <TextField
            {...register('slug')}
            value={slugValue}
            onChange={(e) => {
              setValue('slug', slugify(e.target.value), { shouldDirty: true });
            }}
            label="Slug"
            size="small"
            fullWidth
            sx={{ mb: 1 }}
          />

          {/* Autosave indicator */}
          <Box sx={{ mb: 2 }}>
            <AutosaveIndicator status={autosaveStatus} />
          </Box>

          {/* TipTap editor */}
          <Paper variant="outlined" sx={{ minHeight: 400 }}>
            <TipTapToolbar editor={editor} />
            <Box sx={{ p: 2 }}>
              <EditorContent editor={editor} />
            </Box>
          </Paper>
        </Box>

        {/* Sidebar */}
        <Box
          sx={{
            width: { xs: '100%', lg: 320 },
            flexShrink: 0,
            position: { lg: 'sticky' },
            top: { lg: 16 },
          }}
        >
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            {/* Status */}
            <Box sx={{ mb: 2 }}>
              <StatusChip status={status} />
            </Box>

            {/* Action buttons */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {isDirty && (
                <Button variant="outlined" onClick={handleSaveDraft} fullWidth>
                  Save Draft
                </Button>
              )}
              {!isDirty && (
                <Button variant="outlined" onClick={handleSaveDraft} fullWidth>
                  Save Draft
                </Button>
              )}
              {status === 'draft' && (
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => { submitForReview.mutate(); }}
                  disabled={submitForReview.isPending}
                >
                  Submit for Review
                </Button>
              )}
              {status === 'in_review' && canPublish && (
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => { publish.mutate(); }}
                  disabled={publish.isPending}
                >
                  Publish
                </Button>
              )}
              {status === 'published' && (
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => { unpublish.mutate(); }}
                  disabled={unpublish.isPending}
                >
                  Unpublish
                </Button>
              )}
              <Button
                variant="outlined"
                fullWidth
                onClick={() => { setScheduleDialogOpen(true); }}
              >
                Schedule...
              </Button>
              <Button
                variant="text"
                fullWidth
                onClick={() => { navigate(`/${type}s/${id}/versions`); }}
                disabled={id === 'new'}
              >
                View history
              </Button>
            </Box>
          </Paper>

          {/* SEO section */}
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="labelLarge" sx={{ mb: 2, display: 'block' }}>
              SEO
            </Typography>

            {/* Meta title */}
            <Box sx={{ mb: 2 }}>
              <TextField
                {...register('seo.metaTitle')}
                label="Meta Title"
                size="small"
                fullWidth
                error={metaTitle.length > 70}
                slotProps={{ htmlInput: { maxLength: 150 } }}
              />
              <FormHelperText error={metaTitle.length > 70}>
                {metaTitle.length > 70 ? 'Too long' : ''}
              </FormHelperText>
              <Typography
                variant="bodyMedium"
                color={metaTitle.length > 70 ? 'error' : 'text.secondary'}
              >
                {String(metaTitle.length)}/70
              </Typography>
            </Box>

            {/* Meta description */}
            <Box sx={{ mb: 2 }}>
              <TextField
                {...register('seo.metaDescription')}
                label="Meta Description"
                size="small"
                fullWidth
                multiline
                rows={3}
                error={metaDescription.length > 160}
                slotProps={{ htmlInput: { maxLength: 300 } }}
              />
              <FormHelperText error={metaDescription.length > 160}>
                {metaDescription.length > 160 ? 'Too long' : ''}
              </FormHelperText>
              <Typography
                variant="bodyMedium"
                color={metaDescription.length > 160 ? 'error' : 'text.secondary'}
              >
                {String(metaDescription.length)}/160
              </Typography>
            </Box>

            {/* Social image */}
            {socialImage ? (
              <Box sx={{ mb: 1 }}>
                <Box
                  component="img"
                  src={socialImage.url}
                  alt={socialImage.altText ?? socialImage.filename}
                  sx={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 1, mb: 0.5 }}
                />
                <Button
                  variant="outlined"
                  fullWidth
                  size="small"
                  onClick={() => { setSocialImagePickerOpen(true); }}
                >
                  Change social image
                </Button>
              </Box>
            ) : (
              <Button
                variant="outlined"
                fullWidth
                sx={{ mb: 1 }}
                onClick={() => { setSocialImagePickerOpen(true); }}
                aria-label="Select social image"
              >
                Select social image
              </Button>
            )}

            {/* Featured image */}
            {featuredImage ? (
              <Box>
                <Box
                  component="img"
                  src={featuredImage.url}
                  alt={featuredImage.altText ?? featuredImage.filename}
                  sx={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 1, mb: 0.5 }}
                />
                <Button
                  variant="outlined"
                  fullWidth
                  size="small"
                  onClick={() => { setFeaturedImagePickerOpen(true); }}
                >
                  Change featured image
                </Button>
              </Box>
            ) : (
              <Button
                variant="outlined"
                fullWidth
                onClick={() => { setFeaturedImagePickerOpen(true); }}
                aria-label="Select featured image"
              >
                Select featured image
              </Button>
            )}
          </Paper>

          {/* Tags */}
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="labelLarge" sx={{ mb: 1, display: 'block' }}>
              Tags
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
              {tags.map((tag) => (
                <Box
                  key={tag}
                  component="span"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1,
                    py: 0.25,
                    borderRadius: 4,
                    bgcolor: 'action.selected',
                    fontSize: 12,
                  }}
                >
                  {tag}
                  <Box
                    component="button"
                    onClick={() => { removeTag(tag); }}
                    sx={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      p: 0,
                      lineHeight: 1,
                    }}
                    aria-label={`Remove tag ${tag}`}
                  >
                    ×
                  </Box>
                </Box>
              ))}
            </Box>
            <TextField
              value={tagInput}
              onChange={(e) => { setTagInput(e.target.value); }}
              onKeyDown={handleTagKeyDown}
              placeholder="Add tag..."
              size="small"
              fullWidth
              slotProps={{ htmlInput: { 'aria-label': 'tag input' } }}
            />
          </Paper>

          {/* Category */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="labelLarge" sx={{ mb: 1, display: 'block' }}>
              Category
            </Typography>
            <TextField
              {...register('category')}
              placeholder="Category"
              size="small"
              fullWidth
            />
          </Paper>
        </Box>
      </Box>

      {/* Media pickers */}
      <MediaPickerDialog
        open={socialImagePickerOpen}
        onClose={() => { setSocialImagePickerOpen(false); }}
        onSelect={(item) => {
          setSocialImage(item);
        }}
      />
      <MediaPickerDialog
        open={featuredImagePickerOpen}
        onClose={() => { setFeaturedImagePickerOpen(false); }}
        onSelect={(item) => {
          setFeaturedImage(item);
        }}
      />

      {/* Schedule dialog */}
      <Dialog open={scheduleDialogOpen} onClose={() => { setScheduleDialogOpen(false); }}>
        <DialogTitle>Schedule Publication</DialogTitle>
        <DialogContent>
          <TextField
            type="datetime-local"
            value={scheduleDate}
            onChange={(e) => { setScheduleDate(e.target.value); }}
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setScheduleDialogOpen(false); }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              setScheduleDialogOpen(false);
            }}
          >
            Schedule
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={saveError !== null}
        autoHideDuration={4000}
        onClose={() => { setSaveError(null); }}
      >
        <Alert severity="error" onClose={() => { setSaveError(null); }}>
          {saveError}
        </Alert>
      </Snackbar>
    </Container>
  );
}
