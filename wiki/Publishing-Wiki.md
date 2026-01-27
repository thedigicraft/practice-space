# Publishing the Wiki to GitHub

GitHub wikis are separate repos named `<repo>.wiki`. To publish these pages:

```bash
# Replace with your GitHub repo name
REPO="yourusername/practice-space"

# Clone the wiki repo
git clone "https://github.com/$REPO.wiki.git"

# Copy wiki pages from your workspace
cp -R wiki/* "$REPO.wiki"

# Commit and push
cd "$REPO.wiki"
git add .
git commit -m "Add initial usage wiki"
git push origin main
```

Then visit your GitHub repository → Wiki tab to view the pages.
