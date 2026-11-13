#!/usr/bin/perl
# Troca os títulos (itálico 800/900 com 16 px ou mais) para a fonte de display (Jersey 10):
# estilo normal, peso 400, família var(--bl-font-display). Rótulos menores ficam em Inter.
# Só mexe em blocos sem chaves internas (as regras de verdade, inclusive dentro de @media).
use strict;
use warnings;
my $tot = 0;
for my $f (@ARGV) {
  local $/;
  open(my $in, '<', $f) or die $f;
  my $css = <$in>;
  close $in;
  my $n = 0;
  $css =~ s{\{([^{}]*)\}}{
    my $b = $1;
    my $it = ($b =~ /font-style:\s*italic/ || $b =~ /font:\s*italic\b/);
    my $w = ($b =~ /font-weight:\s*(800|900)/ || $b =~ /font:\s*(?:italic\s+)?(?:800|900)\b/);
    my ($fs) = $b =~ /font-size:\s*([\d.]+)px/;
    ($fs) = $b =~ /font:[^;]*?\s([\d.]+)px/ unless defined $fs;
    if ($it && $w && defined $fs && $fs >= 16) {
      $n++;
      # forma longa
      $b =~ s/font-style:\s*italic/font-style: normal/g;
      $b =~ s/font-weight:\s*(800|900)/font-weight: 400/g;
      # forma curta: font: italic 900 20px var(--bl-font-text)
      $b =~ s/font:\s*italic\s+(?:800|900)\s+/font: 400 /g;
      $b =~ s/font:\s*(?:800|900)\s+/font: 400 /g;
      $b =~ s/(font:[^;]*?)var\(--bl-font-text\)/$1var(--bl-font-display)/g;
      $b =~ s/(font:[^;]*?)var\(--(?:sh|prf|col|tm|atr)-font\)/$1var(--bl-font-display)/g;
      if ($b =~ /font-family:/) {
        $b =~ s/font-family:\s*[^;]+/font-family: var(--bl-font-display)/g;
      } elsif ($b !~ /font:[^;]*--bl-font-display/) {
        $b =~ s/(\s*)$/\n  font-family: var(--bl-font-display);$1/;
      }
    }
    "{$b}";
  }ge;
  open(my $out, '>', $f) or die $f;
  print $out $css;
  close $out;
  print "$f: $n\n";
  $tot += $n;
}
print "total: $tot\n";
